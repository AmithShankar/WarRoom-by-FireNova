import { prisma } from '@/lib/prisma';
import { readSession, SESSION_COOKIE } from '@/lib/session';

function getCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

// SESSION_SECRET counts as missing unless it is a string of 32 or more characters.
export function getSessionSecret(env: Record<string, string | undefined> = process.env): string | null {
  const secret = env.SESSION_SECRET;
  return typeof secret === 'string' && secret.length >= 32 ? secret : null;
}

/** The signed session in the request cookie, before any database check. */
export function readRequestSession(req: Request): { tag: string; version: number } | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  return readSession(getCookie(req.headers.get('cookie'), SESSION_COOKIE), secret, new Date());
}

/**
 * Client IP used to key the sign-in rate limiter.
 *
 * This assumes Vercel: Vercel sets x-real-ip and x-vercel-forwarded-for itself and overwrites
 * x-forwarded-for, so a client cannot spoof them. On another host or behind another proxy these
 * headers may be client-controlled; configure that proxy to overwrite them, or the IP limit can
 * be dodged (the per-tag limit still applies).
 *
 * Limitation: the limiter is in memory, so it is per serverless instance and resets on a cold
 * start. It slows automated guessing but is not a hard global limit. A shared store (database
 * table or KV) would be needed for that; see src/lib/rate-limit.ts.
 */
export function readClientIp(req: Request): string | null {
  const firstHop = (value: string | null) => value?.split(',')[0]?.trim() || null;
  return (
    firstHop(req.headers.get('x-real-ip')) ??
    firstHop(req.headers.get('x-vercel-forwarded-for')) ??
    firstHop(req.headers.get('x-forwarded-for'))
  );
}

export function createContext({ req, resHeaders }: { req: Request; resHeaders: Headers }) {
  const session = readRequestSession(req);
  return {
    prisma,
    sessionTag: session?.tag ?? null,
    sessionVersion: session?.version ?? 0,
    resHeaders,
    clientIp: readClientIp(req),
  };
}

export type Context = ReturnType<typeof createContext>;
