export type RaidRowLite = {
  playerTag: string;
  name: string;
  attacks: number;
  attackLimit: number;
  looted: number;
};

export type RaidTableRow = RaidRowLite & { missed: boolean };

/**
 * One row per current member who joined before the season ended. Members with
 * no participation row are filled in as missed. Rows for non members are dropped.
 */
export function raidTable(
  rows: RaidRowLite[],
  members: { playerTag: string; name: string; joinedAt: Date }[],
  seasonEnd: Date,
): RaidTableRow[] {
  const byTag = new Map(rows.map(r => [r.playerTag, r]));
  return members
    .filter(m => m.joinedAt.getTime() < seasonEnd.getTime())
    .map(m => {
      const r = byTag.get(m.playerTag);
      return r
        ? { ...r, name: m.name, missed: false }
        : { playerTag: m.playerTag, name: m.name, attacks: 0, attackLimit: 6, looted: 0, missed: true };
    })
    .sort((a, b) => b.looted - a.looted);
}

/** Rows worth writing: skip seasons already stored whose weekend has ended. */
export function raidRowsToWrite<T extends { seasonStart: Date; seasonEnd: Date }>(
  rows: T[],
  storedStarts: Date[],
  now: Date,
): T[] {
  const stored = new Set(storedStarts.map(d => d.getTime()));
  return rows.filter(r => !(stored.has(r.seasonStart.getTime()) && r.seasonEnd.getTime() < now.getTime()));
}
