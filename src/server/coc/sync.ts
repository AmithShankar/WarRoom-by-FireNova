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
  type WarArchive,
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

  const stats = await db.warParticipation.groupBy({
    by: ['playerTag'],
    where: { warRecord: { isCwl: true, endTime: { gte: seasonStart, lt: seasonEnd } } },
    _sum: { starsEarned: true, attacksUsed: true },
    _avg: { destruction: true },
  });

  // Reset every player's CWL fields to 0, then apply current-season results.
  await db.player.updateMany({ data: { cwlStars: 0, cwlAttacksUsed: 0, cwlDestruction: 0 } });

  if (stats.length > 0) {
    await Promise.all(
      stats.map(s =>
        db.player.updateMany({
          where: { playerTag: s.playerTag },
          data: {
            cwlStars:        s._sum.starsEarned  ?? 0,
            cwlAttacksUsed:  s._sum.attacksUsed  ?? 0,
            cwlDestruction:  s._avg.destruction  ?? 0,
          },
        }),
      ),
    );
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
    const seenTags = new Set<string>();

    for (const m of items) {
      seenTags.add(m.tag);
      const cocFields = mapMemberToPlayer(m);
      const existing = await prisma.player.findUnique({
        where: { playerTag: m.tag },
        select: { id: true, status: true },
      });
      const isRejoin =
        existing != null && (existing.status === 'Left' || existing.status === 'Kicked');
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
        await prisma.clanActivity.create({
          data: {
            date: new Date(),
            type: 'join',
            player: m.name,
            summary: `${m.name} joined the clan`,
          },
        });
      } else if (isRejoin) {
        await prisma.clanActivity.create({
          data: {
            date: new Date(),
            type: 'join',
            player: m.name,
            summary: `${m.name} rejoined the clan`,
          },
        });
      }
    }

    const dbPlayers = await prisma.player.findMany({
      where: { status: { notIn: ['Left', 'Kicked'] } },
      select: { id: true, playerTag: true, name: true },
    });
    for (const p of dbPlayers) {
      if (!seenTags.has(p.playerTag)) {
        await prisma.player.update({
          where: { id: p.id },
          data: { status: 'Left', removedAt: new Date() },
        });
        await prisma.clanActivity.create({
          data: {
            date: new Date(),
            type: 'kick',
            player: p.name,
            summary: `${p.name} left the clan`,
          },
        });
      }
    }

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

    try {
      const groupRaw = await cocGet<unknown>(`/clans/${CLAN_TAG}/currentwar/leaguegroup`);
      const group = cocLeagueGroupResponse.parse(groupRaw);
      const warTags = group.rounds.flatMap(r => r.warTags).filter(t => t && t !== '#0');
      for (const warTag of warTags) {
        try {
          const cwlRaw = await cocGet<unknown>(`/clanwarleagues/wars/${warTag}`);
          const cwlWar = cocClanWarLeagueWar.parse(cwlRaw);
          const archive = mapCwlWarToRecord(cwlWar, warTag, CLAN_TAG);
          if (archive) await archiveWar(prisma, archive);
        } catch (e) {
          console.warn(`CWL war ${warTag} skipped:`, e instanceof Error ? e.message : e);
        }
      }
    } catch (e) {
      if (!(e instanceof CocApiError) || e.status !== 404) {
        console.warn('CWL leaguegroup sync skipped:', e instanceof Error ? e.message : e);
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
