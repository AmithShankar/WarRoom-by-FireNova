export type LineupSortInput = {
  playerTag: string;
  name: string;
  townHallLevel: number;
};

/** Returns player tags ordered for CWL slots 1..N: Town Hall descending,
 *  ties broken by name ascending. The index in the result is `slot - 1`. */
export function sortLineupByTownHall(players: LineupSortInput[]): string[] {
  return [...players]
    .sort((a, b) =>
      b.townHallLevel - a.townHallLevel || a.name.localeCompare(b.name),
    )
    .map(p => p.playerTag);
}
