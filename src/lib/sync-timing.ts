export const SYNC_GUARD_MS = 2 * 60_000;
export const SYNC_STALE_MS = 10 * 60_000;

export function isSyncInProgress(
  latest: { startedAt: Date; finishedAt: Date | null } | null,
  now: Date,
): boolean {
  if (!latest || latest.finishedAt) return false;
  return now.getTime() - latest.startedAt.getTime() < SYNC_GUARD_MS;
}

export function isStale(lastFinishedAt: Date | null, now: Date): boolean {
  if (!lastFinishedAt) return true;
  return now.getTime() - lastFinishedAt.getTime() > SYNC_STALE_MS;
}

// A manual (leader) sync may start at most once per 5 minutes, measured from the last sync start.
export const MANUAL_SYNC_COOLDOWN_MS = 5 * 60_000;

export type SyncClaimDecision = 'ok' | 'in_progress' | 'cooldown';

/**
 * Whether a new sync may start, given the SyncLock row. Mirrors the conditional UPDATE in
 * claimSync (src/server/coc/sync-claim.ts), which is what actually enforces it; this function
 * only explains a refused claim. minIntervalMs 0 = no cooldown (cron).
 */
export function syncClaimDecision(
  lock: { lockedUntil: Date | null; lastStartedAt: Date | null } | null,
  now: Date,
  minIntervalMs: number,
): SyncClaimDecision {
  if (lock?.lockedUntil && lock.lockedUntil.getTime() >= now.getTime()) return 'in_progress';
  if (minIntervalMs > 0 && lock?.lastStartedAt && lock.lastStartedAt.getTime() > now.getTime() - minIntervalMs) {
    return 'cooldown';
  }
  return 'ok';
}
