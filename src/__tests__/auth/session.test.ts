import { describe, it, expect } from 'vitest';
import { signSession, readSession, SESSION_COOKIE, SESSION_MAX_AGE_S } from '@/lib/session';

const secret = 'x'.repeat(32);
const now = new Date('2026-11-18T00:00:00Z');

describe('session cookie', () => {
  it('exports constants', () => {
    expect(SESSION_COOKIE).toBe('warroom_session');
    expect(SESSION_MAX_AGE_S).toBe(30 * 24 * 60 * 60);
  });
  it('round trips', () => expect(readSession(signSession('#ABC', secret, now), secret, now)).toEqual({ tag: '#ABC' }));
  it('rejects a tampered payload', () => {
    const [, sig] = signSession('#ABC', secret, now).split('.');
    const forged = Buffer.from(JSON.stringify({ tag: '#EVIL', iat: now.getTime() })).toString('base64url') + '.' + sig;
    expect(readSession(forged, secret, now)).toBeNull();
  });
  it('rejects another secret', () => expect(readSession(signSession('#ABC', secret, now), 'y'.repeat(32), now)).toBeNull());
  it('expires after 30 days', () => expect(readSession(signSession('#ABC', secret, now), secret, new Date('2026-12-19T00:00:00Z'))).toBeNull());
  it('rejects garbage', () => {
    expect(readSession('nope', secret, now)).toBeNull();
    expect(readSession(undefined, secret, now)).toBeNull();
    expect(readSession('', secret, now)).toBeNull();
    expect(readSession('a.b.c', secret, now)).toBeNull();
    expect(readSession('abc.', secret, now)).toBeNull();
  });
  it('rejects a short signature without throwing', () => {
    const [payload] = signSession('#ABC', secret, now).split('.');
    expect(readSession(payload + '.AAAA', secret, now)).toBeNull();
  });
  it('rejects validly signed payloads missing tag or iat', async () => {
    const { createHmac } = await import('node:crypto');
    const mk = (obj: unknown) => {
      const p = Buffer.from(JSON.stringify(obj)).toString('base64url');
      return p + '.' + createHmac('sha256', secret).update(p).digest('base64url');
    };
    expect(readSession(mk({ iat: now.getTime() }), secret, now)).toBeNull();
    expect(readSession(mk({ tag: '#ABC' }), secret, now)).toBeNull();
    expect(readSession(mk({ tag: 5, iat: now.getTime() }), secret, now)).toBeNull();
    expect(readSession(mk({ tag: '#ABC', iat: 'x' }), secret, now)).toBeNull();
    expect(readSession(mk(null), secret, now)).toBeNull();
  });
  it('rejects a payload issued in the future', () => {
    const later = new Date(now.getTime() + 60_000);
    expect(readSession(signSession('#ABC', secret, later), secret, now)).toBeNull();
  });
});
