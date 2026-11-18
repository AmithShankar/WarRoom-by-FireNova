import superjson from 'superjson';

export const CACHE_BUSTER = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';

export function serializeCache(value: unknown): string {
  return superjson.stringify(value);
}

export function deserializeCache(raw: string): unknown {
  return superjson.parse(raw);
}
