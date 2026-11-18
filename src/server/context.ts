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

function readSessionTag(req: Request): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  const session = readSession(getCookie(req.headers.get('cookie'), SESSION_COOKIE), secret, new Date());
  return session?.tag ?? null;
}

function readClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') ?? null;
}

export function createContext({ req, resHeaders }: { req: Request; resHeaders: Headers }) {
  return { prisma, sessionTag: readSessionTag(req), resHeaders, clientIp: readClientIp(req) };
}

export type Context = ReturnType<typeof createContext>;
