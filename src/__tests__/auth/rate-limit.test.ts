import { describe, it, expect } from 'vitest';
import { MemoryRateLimiter } from '@/lib/rate-limit';

describe('MemoryRateLimiter', () => {
  it('allows attempts within limit', () => {
    const limiter = new MemoryRateLimiter(3, 1000);
    const key = '#LEADER';
    const now = 1000;

    expect(limiter.isRateLimited(key, now)).toBe(false);
    limiter.recordAttempt(key, now);

    expect(limiter.isRateLimited(key, now)).toBe(false);
    limiter.recordAttempt(key, now + 100);

    expect(limiter.isRateLimited(key, now + 200)).toBe(false);
    limiter.recordAttempt(key, now + 200);

    // 3 attempts reached
    expect(limiter.isRateLimited(key, now + 300)).toBe(true);
  });

  it('expires old attempts after windowMs passes', () => {
    const limiter = new MemoryRateLimiter(2, 500);
    const key = '#LEADER';

    limiter.recordAttempt(key, 1000);
    limiter.recordAttempt(key, 1100);
    expect(limiter.isRateLimited(key, 1200)).toBe(true);

    // After window passes (1000 + 500 = 1500)
    expect(limiter.isRateLimited(key, 1600)).toBe(false);
  });

  it('resets attempts for a key', () => {
    const limiter = new MemoryRateLimiter(2, 500);
    const key = '#LEADER';

    limiter.recordAttempt(key, 1000);
    limiter.recordAttempt(key, 1100);
    expect(limiter.isRateLimited(key, 1200)).toBe(true);

    limiter.reset(key);
    expect(limiter.isRateLimited(key, 1200)).toBe(false);
  });
});
