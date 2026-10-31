import { describe, it, expect } from 'vitest';
import { raidTable, raidRowsToWrite } from '@/lib/events';

const end = new Date('2026-10-26T07:00:00Z');
const members = [
  { playerTag: '#A', name: 'A', joinedAt: new Date('2026-01-01') },
  { playerTag: '#B', name: 'B', joinedAt: new Date('2026-01-01') },
  { playerTag: '#NEW', name: 'N', joinedAt: new Date('2026-10-27') },
];

describe('raidTable', () => {
  it('marks current members without a row as missed', () => {
    const t = raidTable([{ playerTag: '#A', name: 'A', attacks: 6, attackLimit: 6, looted: 20000 }], members, end);
    expect(t.find(r => r.playerTag === '#B')).toMatchObject({ attacks: 0, missed: true });
  });
  it('drops players who left and players who joined after the season', () => {
    const t = raidTable([{ playerTag: '#LEFT', name: 'L', attacks: 6, attackLimit: 6, looted: 1 }], members, end);
    expect(t.map(r => r.playerTag).sort()).toEqual(['#A', '#B']);
  });
  it('sorts by looted desc', () => {
    const t = raidTable([
      { playerTag: '#A', name: 'A', attacks: 3, attackLimit: 6, looted: 5000 },
      { playerTag: '#B', name: 'B', attacks: 6, attackLimit: 6, looted: 20000 },
    ], members, end);
    expect(t.map(r => r.playerTag)).toEqual(['#B', '#A']);
    expect(t[0].missed).toBe(false);
  });
});

describe('raidRowsToWrite', () => {
  const now = new Date('2026-10-31T00:00:00Z');
  const old = { seasonStart: new Date('2026-10-17T07:00:00Z'), seasonEnd: new Date('2026-10-20T07:00:00Z') };
  const live = { seasonStart: new Date('2026-10-30T07:00:00Z'), seasonEnd: new Date('2026-11-02T07:00:00Z') };
  const fresh = { seasonStart: new Date('2026-10-10T07:00:00Z'), seasonEnd: new Date('2026-10-13T07:00:00Z') };
  it('skips stored ended seasons, keeps ongoing and unstored ones', () => {
    const out = raidRowsToWrite([old, live, fresh], [old.seasonStart, live.seasonStart], now);
    expect(out).toEqual([live, fresh]);
  });
});
