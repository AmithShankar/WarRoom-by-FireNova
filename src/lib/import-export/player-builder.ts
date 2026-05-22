import type { CWLStats, Player } from '@/lib/types';

const PLAYER_DEFAULTS: Omit<Player, 'playerTag' | 'name' | 'townHallLevel' | 'role' | 'status' | 'postedChallenge' | 'cwlStats' | 'joinedAt'> = {
  donations: 0,
  donationsReceived: 0,
  warStars: 0,
  notes: '',
  troops: { army: '', spells: '', cc: '', comfortBases: [] },
  warPerformance: { totalAttacks: 0, threeStarRate: 0, averageDestruction: 0, missedAttacks: 0 },
  warnings: [],
  recentActivity: [],
};

const CWL_DEFAULTS: CWLStats = { stars: 0, destructionPercentage: 0, attacksUsed: 0 };

export function buildFullPlayer(parsed: Partial<Player>, existing?: Player): Player {
  const base = existing ?? {
    ...PLAYER_DEFAULTS,
    joinedAt: new Date().toISOString(),
    playerTag: '',
    name: '',
    townHallLevel: 1,
    role: 'Member' as const,
    status: 'Staying' as const,
    postedChallenge: false,
    cwlStats: { ...CWL_DEFAULTS },
  };
  return {
    ...base,
    ...parsed,
    cwlStats: { ...base.cwlStats, ...(parsed.cwlStats ?? {}) },
  };
}

export function mergePlayer(existing: Player, partial: Partial<Player>): Player {
  const result: Player = { ...existing };
  for (const _key of Object.keys(partial)) {
    const key = _key as keyof Player;
    if (key === 'cwlStats') continue; // handled separately
    const v = partial[key];
    if (v !== undefined && v !== null && v !== '') {
      (result as Record<string, unknown>)[key] = v;
    }
  }
  if (partial.cwlStats) {
    result.cwlStats = { ...existing.cwlStats };
    for (const _key of Object.keys(partial.cwlStats)) {
      const key = _key as keyof CWLStats;
      const v = partial.cwlStats[key];
      if (v !== undefined && v !== null) {
        (result.cwlStats as Record<string, unknown>)[key] = v;
      }
    }
  }
  return result;
}
