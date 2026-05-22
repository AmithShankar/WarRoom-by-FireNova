// src/__tests__/import-export/columns.test.ts
import { COLUMNS } from '@/lib/import-export/columns';
import type { Player } from '@/lib/types';

const SAMPLE: Player = {
  playerTag: '#FN001',
  name: 'TestPlayer',
  townHallLevel: 14,
  role: 'Elder',
  status: 'Staying',
  postedChallenge: true,
  cwlStats: { stars: 10, destructionPercentage: 85.5, attacksUsed: 7 },
  joinedAt: new Date().toISOString(),
  donations: 0, donationsReceived: 0, warStars: 0, notes: '',
  troops: { army: '', spells: '', cc: '', comfortBases: [] },
  warPerformance: { totalAttacks: 0, threeStarRate: 0, averageDestruction: 0, missedAttacks: 0 },
  warnings: [], recentActivity: [],
};

describe('COLUMNS', () => {
  it('has exactly 9 columns', () => {
    expect(COLUMNS).toHaveLength(9);
  });

  it('has correct header names in order', () => {
    expect(COLUMNS.map(c => c.header)).toEqual([
      'Player Name', 'Player Tag', 'Town Hall Level', 'Role', 'Status',
      'Challenge Posted', 'CWL Stars', 'Destruction %', 'Attacks Used',
    ]);
  });

  it('getValue returns correct values for a sample player', () => {
    expect(COLUMNS[0].getValue(SAMPLE)).toBe('TestPlayer');
    expect(COLUMNS[1].getValue(SAMPLE)).toBe('#FN001');
    expect(COLUMNS[2].getValue(SAMPLE)).toBe(14);
    expect(COLUMNS[5].getValue(SAMPLE)).toBe('Yes');
    expect(COLUMNS[6].getValue(SAMPLE)).toBe(10);
    expect(COLUMNS[7].getValue(SAMPLE)).toBe(85.5);
  });
});
