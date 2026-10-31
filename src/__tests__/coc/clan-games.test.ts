import { describe, it, expect } from 'vitest';
import { clanGamesWindow, shouldSnapshot, clanGamesPoints } from '@/lib/clan-games';

const w = clanGamesWindow(2026, 9);

describe('clan games', () => {
  it('window is 22nd to 28th 08:00 UTC', () => {
    expect(w.start.toISOString()).toBe('2026-10-22T08:00:00.000Z');
    expect(w.end.toISOString()).toBe('2026-10-28T08:00:00.000Z');
  });
  it('snapshots every sync during the window', () =>
    expect(shouldSnapshot(new Date('2026-10-24T10:00:00Z'), new Date('2026-10-24T09:30:00Z'))).toBe(true));
  it('snapshots for 24h after end, inclusive', () => {
    expect(shouldSnapshot(new Date('2026-10-29T08:00:00Z'), new Date('2026-10-29T07:00:00Z'))).toBe(true);
    expect(shouldSnapshot(new Date('2026-10-29T08:00:01Z'), new Date('2026-10-29T07:00:00Z'))).toBe(false);
  });
  it('once a day before the window', () => {
    expect(shouldSnapshot(new Date('2026-10-18T10:00:00Z'), new Date('2026-10-18T01:00:00Z'))).toBe(false);
    expect(shouldSnapshot(new Date('2026-10-18T10:00:00Z'), new Date('2026-10-17T23:00:00Z'))).toBe(true);
    expect(shouldSnapshot(new Date('2026-10-18T10:00:00Z'), null)).toBe(true);
  });
  it('not before the 15th', () => {
    expect(shouldSnapshot(new Date('2026-10-10T10:00:00Z'), null)).toBe(false);
    expect(shouldSnapshot(new Date('2026-10-15T00:00:00Z'), null)).toBe(true);
  });
  it('points = current minus baseline', () => {
    expect(clanGamesPoints([
      { value: 10000, takenAt: new Date('2026-10-21T00:00:00Z') },
      { value: 14000, takenAt: new Date('2026-10-27T00:00:00Z') },
    ], w)).toBe(4000);
  });
  it('no baseline gives null, not the lifetime total', () => {
    expect(clanGamesPoints([{ value: 14000, takenAt: new Date('2026-10-27T00:00:00Z') }], w)).toBeNull();
  });
  it('no current snapshot gives null', () => {
    expect(clanGamesPoints([{ value: 10000, takenAt: new Date('2026-10-21T00:00:00Z') }], w)).toBeNull();
  });
});
