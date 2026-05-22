import type { Player, PlayerStatus, Role } from '@/lib/types';

export type ChallengeFilter = 'Posted' | 'Not Posted';

export type RosterFilters = {
  status: PlayerStatus[];
  role: Role[];
  th: number[];
  challenge: ChallengeFilter[];
};

export const EMPTY_FILTERS: RosterFilters = { status: [], role: [], th: [], challenge: [] };

export function applyRosterFilters(players: Player[], f: RosterFilters): Player[] {
  return players.filter(p => {
    if (f.status.length && !f.status.includes(p.status)) return false;
    if (f.role.length && !f.role.includes(p.role)) return false;
    if (f.th.length && !f.th.includes(p.townHallLevel)) return false;
    if (f.challenge.length) {
      const c: ChallengeFilter = p.postedChallenge ? 'Posted' : 'Not Posted';
      if (!f.challenge.includes(c)) return false;
    }
    return true;
  });
}

export type FilterCounts = {
  status: Record<string, number>;
  role: Record<string, number>;
  th: { value: number; count: number }[];
  challenge: Record<ChallengeFilter, number>;
};

export function deriveFilterCounts(players: Player[]): FilterCounts {
  const status: Record<string, number> = {};
  const role: Record<string, number> = {};
  const thMap = new Map<number, number>();
  const challenge: Record<ChallengeFilter, number> = { Posted: 0, 'Not Posted': 0 };
  for (const p of players) {
    status[p.status] = (status[p.status] ?? 0) + 1;
    role[p.role] = (role[p.role] ?? 0) + 1;
    thMap.set(p.townHallLevel, (thMap.get(p.townHallLevel) ?? 0) + 1);
    challenge[p.postedChallenge ? 'Posted' : 'Not Posted']++;
  }
  const th = [...thMap.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.value - a.value);
  return { status, role, th, challenge };
}
