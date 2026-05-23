import { runSync } from '@/server/coc/sync';

export async function GET() {
  try {
    const result = await runSync();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
