import { prisma, type PrismaClient } from '@/lib/prisma';
import { mapWithLimit } from '@/lib/concurrency';
import { shouldSnapshot } from '@/lib/clan-games';
import { raidRowsToWrite } from '@/lib/events';
import { claimSync, releaseSync } from './sync-claim';
import { syncErrorCode } from './sync-errors';
import { cocGet, CocApiError } from './client';
import { sendExpiryNotification, toReadableReason } from './push';
import {
  cocMembersResponse,
  cocCurrentWarResponse,
  cocLeagueGroupResponse,
  cocClanWarLeagueWar,
  cocRaidSeasonsResponse,
  cocPlayerResponse,
} from './schemas';
import {
  mapMemberToPlayer,
  mapCurrentWar,
  mapEndedWarToRecord,
  mapCwlWarToRecord,
  mapCwlWarToCurrent,
  mapRaidSeasons,
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

// Push sends per sync are capped so a large subscription table cannot eat the function timeout.
const MAX_PUSH_SENDS_PER_SYNC = 50;

export type RunSyncOptions = {
  /** Refuse to start if the last sync started less than this long ago. 0 (cron) = no cooldown. */
  minIntervalMs?: number;
};

export async function runSync(
  opts: RunSyncOptions = {},
): Promise<{ membersSynced: number; skipped?: true; reason?: 'in_progress' | 'cooldown' }> {
  const minIntervalMs = opts.minIntervalMs ?? 0;
  let claim;
  try {
    claim = await claimSync(prisma, new Date(), minIntervalMs, minIntervalMs > 0 ? 'manual' : 'cron');
  } catch (err) {
    // Named separately so a claim failure is easy to tell apart from a CoC API error in the logs.
    console.error('Sync claim (claimSync) failed:', err);
    throw err;
  }
  if (!claim.ok) return { membersSynced: 0, skipped: true, reason: claim.reason };

  const log = { id: claim.logId };
  try {
    return await runClaimedSync(log);
  } finally {
    // Free the lock for the next sync. If this fails, the lock still expires after SYNC_LOCK_TTL_MS.
    await releaseSync(prisma, claim.token).catch(err => console.error('Sync lock release failed:', err));
  }
}

async function runClaimedSync(log: { id: string }): Promise<{ membersSynced: number }> {
  try {
    if (!CLAN_TAG) throw new Error('COC_CLAN_TAG is not set');

    // Start the four independent CoC fetches together; results are handled in the original order below.
    const [membersResult, warResult, groupResult, raidResult] = await Promise.allSettled([
      cocGet<unknown>(`/clans/${CLAN_TAG}/members`),
      cocGet<unknown>(`/clans/${CLAN_TAG}/currentwar`),
      cocGet<unknown>(`/clans/${CLAN_TAG}/currentwar/leaguegroup`),
      cocGet<unknown>(`/clans/${CLAN_TAG}/capitalraidseasons?limit=10`),
    ]);

    if (membersResult.status === 'rejected') throw membersResult.reason;
    const membersRaw = membersResult.value;
    const { items } = cocMembersResponse.parse(membersRaw);
    const seenTags = new Set(items.map(m => m.tag));

    // Pre-fetch all existing players in one query, then upsert in parallel.
    const existingPlayers = await prisma.player.findMany({
      where: { playerTag: { in: [...seenTags] } },
      select: { playerTag: true, status: true },
    });
    const existingByTag = new Map(existingPlayers.map(p => [p.playerTag, p]));

    const activities = await mapWithLimit(items, 5, async m => {
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
        return { date: new Date(), type: 'join', player: m.name, summary: `${m.name} joined the clan` };
      }
      if (isRejoin) {
        return { date: new Date(), type: 'join', player: m.name, summary: `${m.name} rejoined the clan` };
      }
      return null;
    });
    const joinActivity = activities.filter((a): a is NonNullable<typeof a> => a !== null);
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
      if (warResult.status === 'rejected') throw warResult.reason;
      const warRaw = warResult.value;
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
      if (groupResult.status === 'rejected') throw groupResult.reason;
      const groupRaw = groupResult.value;
      const group = cocLeagueGroupResponse.parse(groupRaw);
      const allWarTags = group.rounds.flatMap(r => r.warTags);
      // Pair each warTag with its 1-based day number (round index + 1).
      const warTagsWithDay = group.rounds.flatMap((r, i) =>
        r.warTags.filter(t => t && t !== '#0').map(t => ({ warTag: t, day: i + 1 })),
      );
      console.log(`[CWL] leaguegroup: state=${group.state} season=${group.season ?? 'n/a'} rounds=${group.rounds.length} totalTags=${allWarTags.length} activeTags=${warTagsWithDay.length}`);

      // Step 1: fetch all CWL war data in parallel — HTTP calls don't use DB connections.
      const archives: WarArchive[] = [];
      // Collect all candidate current wars; after Promise.all we pick the best one.
      const cwlWarCandidates: CwlCurrentWarResult[] = [];

      await Promise.all(
        warTagsWithDay.map(async ({ warTag, day }) => {
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

            const current = mapCwlWarToCurrent(cwlWar, CLAN_TAG, day);
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

    // Raid weekend results per player; failures only warn.
    try {
      if (raidResult.status === 'rejected') throw raidResult.reason;
      const stored = await prisma.raidParticipation.findMany({
        distinct: ['seasonStart'],
        select: { seasonStart: true },
      });
      const rows = raidRowsToWrite(
        mapRaidSeasons(cocRaidSeasonsResponse.parse(raidResult.value)),
        stored.map(s => s.seasonStart),
        new Date(),
      );
      await mapWithLimit(rows, 5, row =>
        prisma.raidParticipation.upsert({
          where: { seasonStart_playerTag: { seasonStart: row.seasonStart, playerTag: row.playerTag } },
          update: row,
          create: row,
        }),
      );
    } catch (e) {
      console.warn('Raid sync failed:', e instanceof Error ? e.message : e);
    }

    // Clan games has no API: snapshot each member's cumulative Games Champion achievement.
    try {
      const last = await prisma.clanGamesSnapshot.findFirst({
        orderBy: { takenAt: 'desc' },
        select: { takenAt: true },
      });
      if (shouldSnapshot(new Date(), last?.takenAt ?? null)) {
        const snaps = await mapWithLimit(items.map(m => m.tag), 5, async playerTag => {
          try {
            const raw = await cocGet<unknown>(`/players/${playerTag}`);
            const champ = cocPlayerResponse.parse(raw).achievements.find(a => a.name === 'Games Champion');
            return champ ? { playerTag, value: champ.value } : null;
          } catch {
            return null;
          }
        });
        const data = snaps.filter((s): s is NonNullable<typeof s> => s !== null);
        if (data.length > 0) await prisma.clanGamesSnapshot.createMany({ data });
      }
    } catch (e) {
      console.warn('Clan games snapshot failed:', e instanceof Error ? e.message : e);
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
        // Only devices registered by a current Leader or Co-Leader receive expiry alerts.
        const subs = await prisma.pushSubscription.findMany({
          where: {
            ownerTag: {
              in: (
                await prisma.player.findMany({
                  where: { role: { in: ['Leader', 'CoLeader'] }, status: { notIn: ['Left', 'Kicked'] } },
                  select: { playerTag: true },
                })
              ).map(p => p.playerTag),
            },
          },
          orderBy: { createdAt: 'desc' },
          take: MAX_PUSH_SENDS_PER_SYNC,
          select: { id: true, endpoint: true, p256dh: true, auth: true },
        });
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
    // Full details stay in the server log; the public SyncLog row gets a short code only.
    console.error('Sync failed:', err);
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        message: syncErrorCode(err),
      },
    });
    throw err;
  }
}
