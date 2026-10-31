import { describe, it, expect } from 'vitest';
import { serializeCache, deserializeCache } from '@/lib/query-persist';

describe('query cache serialization', () => {
  it('round trips Date values', () => {
    const d = new Date('2026-10-22T08:00:00Z');
    const back = deserializeCache(serializeCache({ war: { phaseEndsAt: d } })) as { war: { phaseEndsAt: Date } };
    expect(back.war.phaseEndsAt).toBeInstanceOf(Date);
    expect(back.war.phaseEndsAt.getTime()).toBe(d.getTime());
  });
});
