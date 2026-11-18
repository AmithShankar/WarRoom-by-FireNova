import { describe, it, expect, vi } from 'vitest';
import { signInDecision } from '@/lib/sign-in';

const TOKEN = 'secret-token-123';

function deps(player: { role: string; status: string } | null, verifyResult: 'ok' | 'invalid' = 'ok') {
  return {
    findPlayer: vi.fn(async (_tag: string) => player),
    verify: vi.fn(async (_tag: string, _token: string) => verifyResult),
  };
}

describe('signInDecision', () => {
  it('returns not_leader for a Member without calling verify', async () => {
    const d = deps({ role: 'Member', status: 'Active' });
    await expect(signInDecision({ tag: '#ABC', token: TOKEN }, d)).resolves.toBe('not_leader');
    expect(d.verify).not.toHaveBeenCalled();
  });

  it('returns not_leader for an unknown tag without calling verify', async () => {
    const d = deps(null);
    await expect(signInDecision({ tag: '#ABC', token: TOKEN }, d)).resolves.toBe('not_leader');
    expect(d.verify).not.toHaveBeenCalled();
  });

  it('returns invalid_token for a CoLeader whose token is invalid', async () => {
    const d = deps({ role: 'CoLeader', status: 'Active' }, 'invalid');
    await expect(signInDecision({ tag: '#ABC', token: TOKEN }, d)).resolves.toBe('invalid_token');
    expect(d.verify).toHaveBeenCalledWith('#ABC', TOKEN);
  });

  it('returns ok for a CoLeader whose token is valid', async () => {
    const d = deps({ role: 'CoLeader', status: 'Active' }, 'ok');
    await expect(signInDecision({ tag: '#ABC', token: TOKEN }, d)).resolves.toBe('ok');
  });

  it('normalises #abc and abc to #ABC', async () => {
    for (const tag of ['#abc', 'abc', ' abc ']) {
      const d = deps({ role: 'Leader', status: 'Active' });
      await signInDecision({ tag, token: TOKEN }, d);
      expect(d.findPlayer).toHaveBeenCalledWith('#ABC');
      expect(d.verify).toHaveBeenCalledWith('#ABC', TOKEN);
    }
  });

  it('never leaks the token through a verify error', async () => {
    const d = {
      findPlayer: vi.fn(async () => ({ role: 'Leader', status: 'Active' })),
      verify: vi.fn(async () => {
        throw new Error(`CoC API 400: {"token":"${TOKEN}"}`);
      }),
    };
    const err = await signInDecision({ tag: '#ABC', token: TOKEN }, d).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('Could not reach Clash of Clans');
    expect((err as Error).message).not.toContain(TOKEN);
    expect(String(err)).not.toContain(TOKEN);
  });

  it('returns rate_limited and skips verify when isRateLimited returns true', async () => {
    const d = {
      ...deps({ role: 'Leader', status: 'Active' }, 'ok'),
      isRateLimited: vi.fn(() => true),
      recordAttempt: vi.fn(),
      resetRateLimit: vi.fn(),
    };
    await expect(signInDecision({ tag: '#ABC', token: TOKEN }, d)).resolves.toBe('rate_limited');
    expect(d.isRateLimited).toHaveBeenCalledWith('#ABC');
    expect(d.verify).not.toHaveBeenCalled();
    expect(d.recordAttempt).not.toHaveBeenCalled();
  });

  it('records attempt and resets rate limit upon successful verification', async () => {
    const d = {
      ...deps({ role: 'Leader', status: 'Active' }, 'ok'),
      isRateLimited: vi.fn(() => false),
      recordAttempt: vi.fn(),
      resetRateLimit: vi.fn(),
    };
    await expect(signInDecision({ tag: '#ABC', token: TOKEN }, d)).resolves.toBe('ok');
    expect(d.recordAttempt).toHaveBeenCalledWith('#ABC');
    expect(d.resetRateLimit).toHaveBeenCalledWith('#ABC');
  });

  it('records attempt and does not reset rate limit when token is invalid', async () => {
    const d = {
      ...deps({ role: 'Leader', status: 'Active' }, 'invalid'),
      isRateLimited: vi.fn(() => false),
      recordAttempt: vi.fn(),
      resetRateLimit: vi.fn(),
    };
    await expect(signInDecision({ tag: '#ABC', token: TOKEN }, d)).resolves.toBe('invalid_token');
    expect(d.recordAttempt).toHaveBeenCalledWith('#ABC');
    expect(d.resetRateLimit).not.toHaveBeenCalled();
  });
});
