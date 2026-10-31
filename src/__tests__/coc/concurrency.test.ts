import { describe, it, expect } from 'vitest';
import { mapWithLimit } from '@/lib/concurrency';

describe('mapWithLimit', () => {
  it('returns results in input order', async () => {
    const out = await mapWithLimit([30, 10, 20], 2, ms => new Promise<number>(r => setTimeout(() => r(ms), ms)));
    expect(out).toEqual([30, 10, 20]);
  });
  it('never runs more than limit at once', async () => {
    let active = 0, peak = 0;
    await mapWithLimit(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
      active++; peak = Math.max(peak, active);
      await new Promise(r => setTimeout(r, 5));
      active--;
    });
    expect(peak).toBe(3);
  });
  it('rejects if any call rejects', async () => {
    await expect(mapWithLimit([1], 2, async () => { throw new Error('x'); })).rejects.toThrow('x');
  });
});
