import { describe, it, expect } from 'vitest';
import { isSyncInProgress, isStale } from '@/lib/sync-timing';

const now = new Date('2026-10-31T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('isSyncInProgress', () => {
  it('in progress when started 1 min ago and unfinished', () =>
    expect(isSyncInProgress({ startedAt: ago(60_000), finishedAt: null }, now)).toBe(true));
  it('crashed sync older than 2 min does not block', () =>
    expect(isSyncInProgress({ startedAt: ago(3 * 60_000), finishedAt: null }, now)).toBe(false));
  it('finished sync is not in progress', () =>
    expect(isSyncInProgress({ startedAt: ago(30_000), finishedAt: ago(10_000) }, now)).toBe(false));
  it('no log is not in progress', () => expect(isSyncInProgress(null, now)).toBe(false));
});

describe('isStale', () => {
  it('stale after 10 min', () => expect(isStale(ago(11 * 60_000), now)).toBe(true));
  it('fresh within 10 min', () => expect(isStale(ago(5 * 60_000), now)).toBe(false));
  it('never synced is stale', () => expect(isStale(null, now)).toBe(true));
});
