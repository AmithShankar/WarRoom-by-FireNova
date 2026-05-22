import type { WarResult } from '@/lib/types';

export type ParticipationRow = {
  playerTag: string;
  name: string;
  attacksUsed: number;
  attacksTotal: number;
  starsEarned: number;
  threeStars: number;
  destruction: number;
  excused: boolean;
};

export type PlayerPerformance = {
  playerTag: string;
  name: string;
  warsParticipated: number;
  attacksUsed: number;
  attacksAvailable: number;
  totalStars: number;
  threeStarAttacks: number;
  threeStarRate: number; // 0-1
  avgDestruction: number; // 0-100
  missedAttacks: number;
  excusedMisses: number;
};

/** Aggregate participation rows into one PlayerPerformance per player. */
export function aggregatePerformance(rows: ParticipationRow[]): PlayerPerformance[] {
  const byTag = new Map<string, PlayerPerformance>();
  const destByTag = new Map<string, number>();

  for (const r of rows) {
    let p = byTag.get(r.playerTag);
    if (!p) {
      p = {
        playerTag: r.playerTag, name: r.name, warsParticipated: 0,
        attacksUsed: 0, attacksAvailable: 0, totalStars: 0,
        threeStarAttacks: 0, threeStarRate: 0, avgDestruction: 0,
        missedAttacks: 0, excusedMisses: 0,
      };
      byTag.set(r.playerTag, p);
    }
    p.name = r.name; // keep the most recent name
    p.warsParticipated += 1;
    p.attacksUsed += r.attacksUsed;
    p.attacksAvailable += r.attacksTotal;
    p.totalStars += r.starsEarned;
    p.threeStarAttacks += r.threeStars;
    const rowMisses = r.attacksTotal - r.attacksUsed;
    if (r.excused) p.excusedMisses += rowMisses;
    else p.missedAttacks += rowMisses;
    destByTag.set(r.playerTag, (destByTag.get(r.playerTag) ?? 0) + r.destruction);
  }

  for (const p of byTag.values()) {
    const destSum = destByTag.get(p.playerTag) ?? 0;
    p.threeStarRate = p.attacksUsed > 0 ? p.threeStarAttacks / p.attacksUsed : 0;
    p.avgDestruction = p.attacksUsed > 0 ? destSum / p.attacksUsed : 0;
  }
  return [...byTag.values()];
}

/** Decide a war result from FireNova's perspective. Stars first, destruction tie-break. */
export function determineResult(
  clanStars: number,
  clanDestruction: number,
  opponentStars: number,
  opponentDestruction: number,
): WarResult {
  if (clanStars !== opponentStars) return clanStars > opponentStars ? 'win' : 'loss';
  if (clanDestruction !== opponentDestruction) {
    return clanDestruction > opponentDestruction ? 'win' : 'loss';
  }
  return 'draw';
}
