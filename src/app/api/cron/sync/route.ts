import { createHash, timingSafeEqual } from 'node:crypto';
import { runSync } from '@/server/coc/sync';

export const maxDuration = 60;

// Constant-time compare: hash both sides so the buffers are always equal length (32 bytes).
function matchesSecret(header: string | null, secret: string): boolean {
  const given = createHash('sha256').update(header ?? '').digest();
  const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
  return timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  // Fails closed: no secret (or a short one) means nobody can trigger the cron sync.
  if (!secret || secret.length < 16 || !matchesSecret(req.headers.get('authorization'), secret)) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const result = await runSync();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error('Cron sync failed:', err);
    return Response.json({ ok: false, error: 'Sync failed' }, { status: 500 });
  }
}
