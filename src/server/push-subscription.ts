import { z } from 'zod';
import type { PrismaClient } from '@/lib/prisma';
import { loadSessionEditor, type Editor } from './trpc';
import { readRequestSession } from './context';

/**
 * Push services browsers actually hand out endpoints for. Anything else is refused, so the
 * server never POSTs to an attacker-chosen host when it sends expiry alerts (blind SSRF).
 * Hosts match exactly or as a subdomain (".<host>"), never as a bare suffix.
 *
 *  - fcm.googleapis.com              Chrome, Edge (Chromium), Opera, Samsung Internet, Android
 *  - push.services.mozilla.com       Firefox (updates.push.services.mozilla.com, autopush)
 *  - push.apple.com                  Safari / iOS web push (web.push.apple.com)
 *  - notify.windows.com              Windows Push Notification Services (*.notify.windows.com)
 *
 * This matches the services listed in the web-push library's documentation (FCM, Mozilla
 * autopush, Apple Push Notification service for web, WNS).
 */
export const ALLOWED_PUSH_HOSTS = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
] as const;

export const MAX_PUSH_SUBSCRIPTIONS_PER_LEADER = 10;
const MAX_ENDPOINT_LENGTH = 1024;

export function isAllowedPushEndpoint(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_PUSH_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
}

const base64url = (min: number, max: number) =>
  z.string().min(min).max(max).regex(/^[A-Za-z0-9_-]+={0,2}$/);

const endpoint = z.string().max(MAX_ENDPOINT_LENGTH).refine(isAllowedPushEndpoint, 'Unsupported push endpoint');

// p256dh is a 65-byte P-256 public key (87 base64url chars); auth is 16 bytes (22 chars).
export const subscribeBody = z.object({
  endpoint,
  keys: z.object({ p256dh: base64url(80, 100), auth: base64url(16, 32) }),
});

export const unsubscribeBody = z.object({ endpoint });

type Db = Pick<PrismaClient, 'player'>;

/** The signed-in current Leader / Co-Leader for a route handler request, or null. */
export async function requestLeader(req: Request, db: Db): Promise<Editor | null> {
  const session = readRequestSession(req);
  if (!session) return null;
  return loadSessionEditor({ prisma: db as never, sessionTag: session.tag, sessionVersion: session.version });
}

/** Parses a JSON body with a schema. Returns null for invalid JSON or a schema mismatch. */
export async function parseJsonBody<T>(req: Request, schema: z.ZodType<T>): Promise<T | null> {
  const raw = await req.text().catch(() => '');
  if (raw.length > 4096) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
