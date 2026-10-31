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
