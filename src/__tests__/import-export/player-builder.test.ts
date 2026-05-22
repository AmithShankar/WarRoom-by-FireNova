// src/__tests__/import-export/player-builder.test.ts
import { buildFullPlayer, mergePlayer } from '@/lib/import-export/player-builder';
import type { Player } from '@/lib/types';

const EXISTING: Player = {
  playerTag: '#FN001', name: 'Old Name', townHallLevel: 14,
  role: 'Member', status: 'Staying', postedChallenge: true,
  cwlStats: { stars: 10, destructionPercentage: 80, attacksUsed: 5 },
  joinedAt: '2024-01-01T00:00:00Z', donations: 500, donationsReceived: 200,
  warStars: 100, notes: 'Keep this note',
  troops: { army: 'Hogs', spells: 'Heal', cc: 'IGolem', comfortBases: ['ring'] },
  warPerformance: { totalAttacks: 50, threeStarRate: 0.6, averageDestruction: 80, missedAttacks: 2 },
  warnings: [{ id: 'w1', date: '', durationHours: 24, expirationDate: '', reason: 'Behavior', notes: '' }],
  recentActivity: [],
};

describe('buildFullPlayer', () => {
  it('fills in defaults for a new player', () => {
    const partial = { playerTag: '#NEW01', name: 'NewPlayer', townHallLevel: 10 };
    const player = buildFullPlayer(partial);
    expect(player.playerTag).toBe('#NEW01');
    expect(player.name).toBe('NewPlayer');
    expect(player.role).toBe('Member');          // default
    expect(player.warnings).toEqual([]);         // default
    expect(player.cwlStats.stars).toBe(0);      // default
  });

  it('preserves non-imported fields when existing player provided', () => {
    const partial = { playerTag: '#FN001', name: 'New Name' };
    const player = buildFullPlayer(partial, EXISTING);
    expect(player.name).toBe('New Name');
    expect(player.notes).toBe('Keep this note');         // preserved
    expect(player.donations).toBe(500);                  // preserved
    expect(player.warnings).toHaveLength(1);             // preserved
  });

  it('merges cwlStats from parsed with existing player', () => {
    const partial = { cwlStats: { stars: 25, destructionPercentage: 95.0, attacksUsed: 8 } };
    const player = buildFullPlayer(partial, EXISTING);
    expect(player.cwlStats.stars).toBe(25);
    expect(player.cwlStats.destructionPercentage).toBe(95.0);
    expect(player.cwlStats.attacksUsed).toBe(8);
    expect(player.donations).toBe(500); // preserved from EXISTING
  });
});

describe('mergePlayer', () => {
  it('overwrites only non-empty parsed fields', () => {
    const partial = { name: 'Updated Name', cwlStats: { stars: 20, destructionPercentage: 0, attacksUsed: 0 } };
    const merged = mergePlayer(EXISTING, partial);
    expect(merged.name).toBe('Updated Name');
    expect(merged.notes).toBe('Keep this note');         // preserved (not in partial)
    expect(merged.cwlStats.stars).toBe(20);
    expect(merged.donations).toBe(500);                  // preserved
  });

  it('does not overwrite with empty string', () => {
    const partial = { name: '' };
    const merged = mergePlayer(EXISTING, partial);
    expect(merged.name).toBe('Old Name');
  });
});
