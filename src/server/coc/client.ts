const BASE = process.env.COC_API_BASE_URL ?? 'https://cocproxy.royaleapi.dev/v1';
const TOKEN = process.env.COC_API_TOKEN ?? '';

export class CocApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'CocApiError';
  }
}

/** GET a CoC API path. Tags containing '#' must be passed raw; this encodes them. */
export async function cocGet<T>(path: string): Promise<T> {
  if (!TOKEN) throw new CocApiError(0, 'COC_API_TOKEN is not set');
  // Encode '#' in clan/player tags within the path.
  const url = `${BASE}${path.replace(/#/g, '%23')}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
    // CoC data changes slowly; avoid Next.js fetch caching for sync correctness.
    cache: 'no-store',
  });
  if (res.status === 429) throw new CocApiError(429, 'CoC API rate limit exceeded');
  if (!res.ok) throw new CocApiError(res.status, `CoC API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
