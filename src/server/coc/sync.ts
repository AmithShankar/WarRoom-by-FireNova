import { prisma, type PrismaClient } from '@/lib/prisma';
import { cocGet, CocApiError } from './client';
import { sendExpiryNotification, toReadableReason } from './push';
import {
  cocMembersResponse,
  cocCurrentWarResponse,
  cocLeagueGroupResponse,
  cocClanWarLeagueWar,
} from './schemas';
import {
  mapMemberToPlayer,
  mapCurrentWar,
  mapEndedWarToRecord,
  mapCwlWarToRecord,
  mapCwlWarToCurrent,
  type WarArchive,
  type CwlCurrentWarResult,
} from './map';

const CLAN_TAG = process.env.COC_CLAN_TAG ?? '';

/**
 * Recomputes the denormalised CWL stats on each Player from the current
 * season's WarParticipation records (isCwl = true, endTime in same UTC month
 * as the most-recently completed CWL war).
 *
 * Why we need this: Player.cwlStars/cwlAttacksUsed/cwlDestruction are read by
 * the Roster and Dashboard but are never written by the CoC member-list sync.
 * The Performance page reads from WarParticipation directly (correct), but
 * Roster/Dashboard use these denormalised fields so we keep them in sync here.
 */
async function updatePlayerCwlStats(db: PrismaClient): Promise<void> {
  const latestCwl = await db.warRecord.findFirst({
    where: { isCwl: true },
    orderBy: { endTime: 'desc' },
    select: { endTime: true },
  });
  if (!latestCwl) return; // no CWL wars archived yet — leave fields at default 0

  // Derive season window: the UTC calendar month of the most recent CWL war end.
  const d = latestCwl.endTime;
  const seasonStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const seasonEnd   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));

  // Prisma groupBy cannot filter on relation fields, so we resolve record IDs first.
  const cwlRecords = await db.warRecord.findMany({
    where: { isCwl: true, endTime: { gte: seasonStart, lt: seasonEnd } },
    select: { id: true },
  });
  if (cwlRecords.length === 0) return; // no completed CWL wars this season yet
  const cwlRecordIds = cwlRecords.map(r => r.id);

  // Query succeeds before we reset — so a query failure leaves existing values intact.
  const stats = await db.warParticipation.groupBy({
    by: ['playerTag'],
    where: { warRecordId: { in: cwlRecordIds } },
    _sum: { starsEarned: true, attacksUsed: true },
    _avg: { destruction: true },
  });

  // Reset every player's CWL fields to 0, then apply current-season results.
  await db.player.updateMany({ data: { cwlStars: 0, cwlAttacksUsed: 0, cwlDestruction: 0 } });

  for (const s of stats) {
    await db.player.updateMany({
      where: { playerTag: s.playerTag },
      data: {
        cwlStars:       s._sum.starsEarned ?? 0,
        cwlAttacksUsed: s._sum.attacksUsed ?? 0,
        cwlDestruction: s._avg.destruction ?? 0,
      },
    });
  }
}

async function archiveWar(db: PrismaClient, archive: WarArchive): Promise<void> {
  const record = await db.warRecord.upsert({
    where: { warKey: archive.record.warKey },
    update: archive.record,
    create: archive.record,
  });
  for (const p of archive.participations) {
    await db.warParticipation.upsert({
      where: { warRecordId_playerTag: { warRecordId: record.id, playerTag: p.playerTag } },
      update: p,
      create: { ...p, warRecordId: record.id },
    });
  }
}

export async function runSync(): Promise<{ membersSynced: number }> {
  const log = await prisma.syncLog.create({ data: { status: 'success' } });
  try {
    if (!CLAN_TAG) throw new Error('COC_CLAN_TAG is not set');

    const membersRaw = await cocGet<unknown>(`/clans/${CLAN_TAG}/members`);
    const { items } = cocMembersResponse.parse(membersRaw);
    const seenTags = new Set(items.map(m => m.tag));

    // Pre-fetch all existing players in one query, then upsert in parallel.
    const existingPlayers = await prisma.player.findMany({
      where: { playerTag: { in: [...seenTags] } },
      select: { playerTag: true, status: true },
    });
    const existingByTag = new Map(existingPlayers.map(p => [p.playerTag, p]));

    const joinActivity: { date: Date; type: string; player: string; summary: string }[] = [];
    for (const m of items) {
      const cocFields = mapMemberToPlayer(m);
      const existing = existingByTag.get(m.tag);
      const isRejoin = existing?.status === 'Left' || existing?.status === 'Kicked';
      await prisma.player.upsert({
        where: { playerTag: m.tag },
        update: {
          ...cocFields,
          ...(isRejoin
            ? { status: 'New', removedAt: null, kickReason: null, joinedAt: new Date() }
            : {}),
        },
        create: { playerTag: m.tag, joinedAt: new Date(), ...cocFields },
      });
      if (!existing) {
        joinActivity.push({ date: new Date(), type: 'join', player: m.name, summary: `${m.name} joined the clan` });
      } else if (isRejoin) {
        joinActivity.push({ date: new Date(), type: 'join', player: m.name, summary: `${m.name} rejoined the clan` });
      }
    }
    if (joinActivity.length > 0) {
      await prisma.clanActivity.createMany({ data: joinActivity });
    }

    // Detect departures: active players not seen in the API response.
    const dbPlayers = await prisma.player.findMany({
      where: { status: { notIn: ['Left', 'Kicked'] } },
      select: { playerTag: true, name: true },
    });
    const departed = dbPlayers.filter(p => !seenTags.has(p.playerTag));
    if (departed.length > 0) {
      await Promise.all([
        prisma.player.updateMany({
          where: { playerTag: { in: departed.map(p => p.playerTag) } },
          data: { status: 'Left', removedAt: new Date() },
        }),
        prisma.clanActivity.createMany({
          data: departed.map(p => ({
            date: new Date(),
            type: 'kick',
            player: p.name,
            summary: `${p.name} left the clan`,
          })),
        }),
      ]);
    }

    // currentwar returns 403 when war log is private or during CWL season.
    // Wrap in try-catch so a 403 here doesn't crash the entire sync.
    try {
      const warRaw = await cocGet<unknown>(`/clans/${CLAN_TAG}/currentwar`);
      const parsedWar = cocCurrentWarResponse.parse(warRaw);
      const mapped = mapCurrentWar(parsedWar);
      await prisma.war.deleteMany({ where: { isCurrent: true } }); // cascades WarMember rows
      if (mapped) {
        await prisma.war.create({
          data: { ...mapped.war, members: { create: mapped.members } },
        });
      }
      const endedRegular = mapEndedWarToRecord(parsedWar);
      if (endedRegular) await archiveWar(prisma, endedRegular);
    } catch (e) {
      if (e instanceof CocApiError && e.status === 403) {
        // Private war log or CWL season restriction — skip regular war sync silently.
      } else {
        console.warn('Current war sync failed:', e instanceof Error ? e.message : e);
      }
    }

    try {
      const groupRaw = await cocGet<unknown>(`/clans/${CLAN_TAG}/currentwar/leaguegroup`);
      const group = cocLeagueGroupResponse.parse(groupRaw);
      const allWarTags = group.rounds.flatMap(r => r.warTags);
      const warTags = allWarTags.filter(t => t && t !== '#0');
      console.log(`[CWL] leaguegroup: state=${group.state} season=${group.season ?? 'n/a'} rounds=${group.rounds.length} totalTags=${allWarTags.length} activeTags=${warTags.length}`);

      // Step 1: fetch all CWL war data in parallel — HTTP calls don't use DB connections.
      const archives: WarArchive[] = [];
      // Collect all candidate current wars; after Promise.all we pick the best one.
      const cwlWarCandidates: CwlCurrentWarResult[] = [];

      await Promise.all(
        warTags.map(async warTag => {
          try {
            const cwlRaw = await cocGet<unknown>(`/clanwarleagues/wars/${warTag}`);
            const cwlWar = cocClanWarLeagueWar.parse(cwlRaw);
            const clanSide = cwlWar.clan.tag ?? '?';
            const oppSide = cwlWar.opponent.tag ?? '?';

            const archive = mapCwlWarToRecord(cwlWar, warTag, CLAN_TAG);
            if (archive) {
              archives.push(archive);
              console.log(`[CWL] war ${warTag}: state=${cwlWar.state} ${clanSide} vs ${oppSide} → archived`);
            }

            const current = mapCwlWarToCurrent(cwlWar, CLAN_TAG);
            if (current) {
              cwlWarCandidates.push(current);
              console.log(`[CWL] war ${warTag}: state=${cwlWar.state} → current war candidate (dashboard)`);
            } else if (!archive) {
              console.log(`[CWL] war ${warTag}: state=${cwlWar.state} ${clanSide} vs ${oppSide} → skipped`);
            }
          } catch (e) {
            console.warn(`[CWL] war ${warTag} skipped:`, e instanceof Error ? e.message : e);
          }
        }),
      );

      // Prefer inWar (battle) over preparation — only fall back to preparation on the first day of CWL
      // when no battle-phase war exists yet. Avoids showing the next round's prep alongside an active battle.
      const activeCwlWar =
        cwlWarCandidates.find(w => w.war.state === 'battle') ??
        cwlWarCandidates[0] ??
        null;

      // Update the War table with the current active CWL war so the dashboard shows it.
      // /currentwar returns 403 during CWL, so this is the only source of current-war data.
      await prisma.war.deleteMany({ where: { isCurrent: true } });
      if (activeCwlWar) {
        await prisma.war.create({
          data: { ...activeCwlWar.war, members: { create: activeCwlWar.members } },
        });
        console.log(`[CWL] current war set: ${activeCwlWar.war.state} vs ${activeCwlWar.war.opponent}`);
      } else {
        console.log('[CWL] no active war found — War table cleared');
      }

      console.log(`[CWL] ${archives.length} wars to archive`);
      // Step 2: write to DB sequentially — avoids saturating the connection pool.
      for (const archive of archives) {
        await archiveWar(prisma, archive);
        console.log(`[CWL] archived ${archive.record.warKey} (${archive.participations.length} participations)`);
      }
    } catch (e) {
      if (!(e instanceof CocApiError) || e.status !== 404) {
        console.warn('[CWL] leaguegroup sync skipped:', e instanceof Error ? e.message : e);
      }
      // 404 just means we're not in CWL this season
    }

    // Recompute denormalised CWL stats on Player from current-season WarParticipation.
    // Runs unconditionally so any previously archived CWL data is always reflected.
    try {
      await updatePlayerCwlStats(prisma);
    } catch (err) {
      console.warn('CWL stats update step failed:', err instanceof Error ? err.message : err);
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'success', finishedAt: new Date(), membersSynced: items.length },
    });

    // Check for expired warnings and push to all subscribed devices.
    try {
      const expiredWarnings = await prisma.warning.findMany({
        where: {
          notified: false,
          expirationDate: { not: null, lte: new Date() },
        },
        include: { player: { select: { name: true } } },
      });

      if (expiredWarnings.length > 0) {
        const subs = await prisma.pushSubscription.findMany();
        const warnings = expiredWarnings.map(w => ({
          name: w.player.name,
          reason: toReadableReason(w.reason),
        }));
        if (subs.length > 0) {
          await sendExpiryNotification(warnings, subs);
        }
        await prisma.warning.updateMany({
          where: { id: { in: expiredWarnings.map(w => w.id) } },
          data: { notified: true },
        });
      }
    } catch (err) {
      console.warn(
        'Push notification step failed:',
        err instanceof Error ? err.message : err,
      );
    }

    return { membersSynced: items.length };
  } catch (err) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    });
    throw err;
  }
}
