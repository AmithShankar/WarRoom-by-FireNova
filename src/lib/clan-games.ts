const DAY_MS = 24 * 60 * 60_000;

/** Clan games run from the 22nd 08:00 UTC to the 28th 08:00 UTC. `month` is 0 based. */
export function clanGamesWindow(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month, 22, 8)),
    end: new Date(Date.UTC(year, month, 28, 8)),
  };
}

const utcDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Snapshot on every sync from the window start to 24h after its end. From the
 * 15th until the window opens, snapshot once per UTC day to capture a baseline.
 */
export function shouldSnapshot(now: Date, lastSnapshotAt: Date | null): boolean {
  const { start, end } = clanGamesWindow(now.getUTCFullYear(), now.getUTCMonth());
  const t = now.getTime();
  if (t >= start.getTime() && t <= end.getTime() + DAY_MS) return true;
  const baselineFrom = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15);
  if (t >= baselineFrom && t < start.getTime()) {
    return lastSnapshotAt === null || utcDate(lastSnapshotAt) < utcDate(now);
  }
  return false;
}

/** Points earned in the window: latest snapshot in it minus the latest one before it. Null if either is missing. */
export function clanGamesPoints(
  snaps: { value: number; takenAt: Date }[],
  window: { start: Date; end: Date },
): number | null {
  const startMs = window.start.getTime();
  const endMs = window.end.getTime() + DAY_MS;
  let baseline: { value: number; takenAt: Date } | null = null;
  let current: { value: number; takenAt: Date } | null = null;
  for (const s of snaps) {
    const t = s.takenAt.getTime();
    if (t < startMs) {
      if (!baseline || t > baseline.takenAt.getTime()) baseline = s;
    } else if (t <= endMs) {
      if (!current || t > current.takenAt.getTime()) current = s;
    }
  }
  return baseline && current ? current.value - baseline.value : null;
}
