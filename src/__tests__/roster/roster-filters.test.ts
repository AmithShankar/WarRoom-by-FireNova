import { describe, it, expect } from 'vitest';
import { applyRosterFilters, deriveFilterCounts } from '@/lib/roster-filters';
import type { Player } from '@/lib/types';

const mk = (over: Partial<Player>): Player => ({
  playerTag: '#A', name: 'A', townHallLevel: 16, role: 'Member', status: 'Staying',
  postedChallenge: true, joinedAt: '', donations: 0, donationsReceived: 0, warStars: 0,
  notes: '', troops: { army: '', spells: '', cc: '', comfortBases: [] },
  warPerformance: { totalAttacks: 0, threeStarRate: 0, averageDestruction: 0, missedAttacks: 0 },
  cwlStats: { stars: 0, destructionPercentage: 0, attacksUsed: 0 },
  warnings: [], recentActivity: [], ...over,
});

const players: Player[] = [
  mk({ playerTag: '#1', role: 'Leader', townHallLevel: 16, postedChallenge: true }),
  mk({ playerTag: '#2', role: 'Member', townHallLevel: 15, postedChallenge: false }),
  mk({ playerTag: '#3', role: 'Member', townHallLevel: 16, postedChallenge: false }),
];

describe('applyRosterFilters', () => {
  it('returns all players when no filters set', () => {
    expect(applyRosterFilters(players, { status: [], role: [], th: [], challenge: [] })).toHaveLength(3);
  });
  it('filters by role with AND semantics', () => {
    const r = applyRosterFilters(players, { status: [], role: ['Member'], th: [16], challenge: [] });
    expect(r.map(p => p.playerTag)).toEqual(['#3']);
  });
  it('filters by challenge posted state', () => {
    const r = applyRosterFilters(players, { status: [], role: [], th: [], challenge: ['Not Posted'] });
    expect(r).toHaveLength(2);
  });
  it('filters by the New status', () => {
    const statusPlayers = [
      mk({ playerTag: '#N', status: 'New' }),
      mk({ playerTag: '#S', status: 'Staying' }),
    ];
    const r = applyRosterFilters(statusPlayers, { status: ['New'], role: [], th: [], challenge: [] });
    expect(r.map(p => p.playerTag)).toEqual(['#N']);
  });
});

describe('deriveFilterCounts', () => {
  it('counts each role over the full roster', () => {
    const c = deriveFilterCounts(players);
    expect(c.role.Member).toBe(2);
    expect(c.role.Leader).toBe(1);
  });
  it('counts town hall levels descending', () => {
    const c = deriveFilterCounts(players);
    expect(c.th).toEqual([{ value: 16, count: 2 }, { value: 15, count: 1 }]);
  });
});
