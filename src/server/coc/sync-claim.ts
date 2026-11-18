import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@/lib/prisma';
import { SYNC_GUARD_MS, syncClaimDecision } from '@/lib/sync-timing';

/** The single SyncLock row. */
export const SYNC_LOCK_ID = 1;
/** A claimed lock expires after this long even if the sync dies without releasing it (> 60 s maxDuration). */
export const SYNC_LOCK_TTL_MS = SYNC_GUARD_MS;

type ClaimDb = Pick<PrismaClient, 'syncLock' | 'syncLog'>;

export type SyncClaim =
  | { ok: true; logId: string; token: string }
  | { ok: false; reason: 'in_progress' | 'cooldown' };

/**
 * Decides whether a sync may start and claims the lock, with one atomic conditional UPDATE on
 * the single SyncLock row:
 *
 *   UPDATE "SyncLock" SET lockedUntil = now + TTL, startedBy = token, lastStartedAt = now
 *   WHERE id = 1 AND (lockedUntil IS NULL OR lockedUntil < now)
 *               [AND (lastStartedAt IS NULL OR lastStartedAt <= now - minIntervalMs)]   -- manual only
 *
 * Postgres row locking serialises concurrent UPDATEs of the same row and re-checks the WHERE
 * against the winner's write, so exactly one caller gets count === 1. No transaction,
 * session-level or advisory lock is involved, so it works through a pooled connection.
 * Cron and manual syncs share the row, so they never overlap; only manual syncs add the cooldown.
 */
export async function claimSync(
  db: ClaimDb,
  now: Date,
  minIntervalMs: number,
  kind: 'cron' | 'manual' = 'cron',
): Promise<SyncClaim> {
  // Make sure the row exists (INSERT ... ON CONFLICT DO NOTHING); the migration also seeds it.
  await db.syncLock.createMany({ data: [{ id: SYNC_LOCK_ID }], skipDuplicates: true });

  const token = `${kind}:${randomUUID()}`;
  const conditions: object[] = [{ OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] }];
  if (minIntervalMs > 0) {
    conditions.push({
      OR: [{ lastStartedAt: null }, { lastStartedAt: { lte: new Date(now.getTime() - minIntervalMs) } }],
    });
  }
  const { count } = await db.syncLock.updateMany({
    where: { id: SYNC_LOCK_ID, AND: conditions },
    data: { lockedUntil: new Date(now.getTime() + SYNC_LOCK_TTL_MS), startedBy: token, lastStartedAt: now },
  });

  if (count !== 1) {
    const row = await db.syncLock.findUnique({
      where: { id: SYNC_LOCK_ID },
      select: { lockedUntil: true, lastStartedAt: true },
    });
    const decision = syncClaimDecision(row, now, minIntervalMs);
    // 'ok' here means the holder released between our UPDATE and this read: still refused.
    return { ok: false, reason: decision === 'cooldown' ? 'cooldown' : 'in_progress' };
  }

  try {
    const log = await db.syncLog.create({ data: { status: 'success', startedAt: now } });
    return { ok: true, logId: log.id, token };
  } catch (err) {
    await releaseSync(db, token).catch(() => {});
    throw err;
  }
}

/** Releases the lock if `token` still holds it. A stale holder (lock expired and re-claimed) is a no-op. */
export async function releaseSync(db: Pick<PrismaClient, 'syncLock'>, token: string): Promise<void> {
  await db.syncLock.updateMany({
    where: { id: SYNC_LOCK_ID, startedBy: token },
    data: { lockedUntil: null },
  });
}
