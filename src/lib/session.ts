import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'warroom_session';
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

function mac(payload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payload).digest();
}

export function signSession(tag: string, secret: string, now: Date): string {
  const payload = Buffer.from(JSON.stringify({ tag, iat: now.getTime() })).toString('base64url');
  return `${payload}.${mac(payload, secret).toString('base64url')}`;
}

export function readSession(
  value: string | undefined,
  secret: string,
  now: Date,
): { tag: string } | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = mac(payload, secret);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || typeof data.tag !== 'string' || typeof data.iat !== 'number') return null;
    const ageMs = now.getTime() - data.iat;
    if (ageMs < 0 || ageMs > SESSION_MAX_AGE_S * 1000) return null;
    return { tag: data.tag };
  } catch {
    return null;
  }
}
