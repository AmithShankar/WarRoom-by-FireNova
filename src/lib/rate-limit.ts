/**
 * In-memory sliding window rate limiter.
 * Tracks timestamps of recent attempts per key and blocks when limit is exceeded.
 */
export class MemoryRateLimiter {
  private attempts = new Map<string, number[]>();

  constructor(
    public readonly maxAttempts = 5,
    public readonly windowMs = 60_000,
  ) {}

  isRateLimited(key: string, now = Date.now()): boolean {
    const validAfter = now - this.windowMs;
    const timestamps = (this.attempts.get(key) ?? []).filter(t => t > validAfter);
    return timestamps.length >= this.maxAttempts;
  }

  recordAttempt(key: string, now = Date.now()): void {
    const validAfter = now - this.windowMs;
    const timestamps = (this.attempts.get(key) ?? []).filter(t => t > validAfter);
    timestamps.push(now);
    this.attempts.set(key, timestamps);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  clear(): void {
    this.attempts.clear();
  }
}

export const signInRateLimiter = new MemoryRateLimiter(5, 60_000);
