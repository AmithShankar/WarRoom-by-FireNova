import { describe, it, expect } from 'vitest';
import { aggregatePerformance, determineResult } from '@/lib/performance';
import type { ParticipationRow } from '@/lib/performance';

const row = (over: Partial<ParticipationRow>): ParticipationRow => ({
  playerTag: '#A', name: 'A', attacksUsed: 2, attacksTotal: 2,
  starsEarned: 5, threeStars: 1, destruction: 184, excused: false, ...over,
});

describe('aggregatePerformance', () => {
  it('aggregates one player across two wars', () => {
    const out = aggregatePerformance([
      row({ attacksUsed: 2, attacksTotal: 2, starsEarned: 6, threeStars: 2, destruction: 200 }),
      row({ attacksUsed: 1, attacksTotal: 2, starsEarned: 2, threeStars: 0, destruction: 80 }),
    ]);
    expect(out).toHaveLength(1);
    const p = out[0];
    expect(p.warsParticipated).toBe(2);
    expect(p.attacksUsed).toBe(3);
    expect(p.attacksAvailable).toBe(4);
    expect(p.totalStars).toBe(8);
    expect(p.threeStarAttacks).toBe(2);
    expect(p.missedAttacks).toBe(1);
    expect(p.threeStarRate).toBeCloseTo(2 / 3);
    expect(p.avgDestruction).toBeCloseTo(280 / 3);
  });
  it('separates distinct players', () => {
    const out = aggregatePerformance([row({ playerTag: '#A' }), row({ playerTag: '#B' })]);
    expect(out.map(p => p.playerTag).sort()).toEqual(['#A', '#B']);
  });
  it('handles zero attacks without dividing by zero', () => {
    const out = aggregatePerformance([
      row({ attacksUsed: 0, attacksTotal: 2, starsEarned: 0, threeStars: 0, destruction: 0 }),
    ]);
    expect(out[0].threeStarRate).toBe(0);
    expect(out[0].avgDestruction).toBe(0);
  });
});

describe('aggregatePerformance excused misses', () => {
  it('excludes excused-war misses from missedAttacks', () => {
    const out = aggregatePerformance([
      row({ attacksUsed: 0, attacksTotal: 2, excused: true }),
      row({ attacksUsed: 1, attacksTotal: 2, excused: false }),
    ]);
    expect(out[0].missedAttacks).toBe(1);
    expect(out[0].excusedMisses).toBe(2);
  });
  it('treats non-excused rows exactly as before', () => {
    const out = aggregatePerformance([row({ attacksUsed: 1, attacksTotal: 2, excused: false })]);
    expect(out[0].missedAttacks).toBe(1);
    expect(out[0].excusedMisses).toBe(0);
  });
});

describe('determineResult', () => {
  it('wins on more stars', () => {
    expect(determineResult(30, 90, 25, 95)).toBe('win');
  });
  it('loses on fewer stars', () => {
    expect(determineResult(20, 99, 25, 80)).toBe('loss');
  });
  it('breaks star ties by destruction', () => {
    expect(determineResult(30, 96, 30, 94)).toBe('win');
    expect(determineResult(30, 90, 30, 90)).toBe('draw');
  });
});
