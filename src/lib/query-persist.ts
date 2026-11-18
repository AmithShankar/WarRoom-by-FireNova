import superjson from 'superjson';

import type { QueryClient } from '@tanstack/react-query';

export const CACHE_BUSTER = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
export const CACHE_KEY = 'warroom-cache';

export function serializeCache(value: unknown): string {
  return superjson.stringify(value);
}

export function deserializeCache(raw: string): unknown {
  return superjson.parse(raw);
}

/**
 * On sign-out, drop everything a leader could see (notes, reasons, attribution) from this
 * browser: the persisted localStorage copy and the in-memory query cache. Active queries are
 * reset and refetch as a visitor. Storage errors (blocked site data) are ignored.
 */
export async function clearLeaderData(
  queryClient: QueryClient,
  storage: Pick<Storage, 'removeItem'> | null | undefined,
): Promise<void> {
  try {
    storage?.removeItem(CACHE_KEY);
  } catch {
    // Site data blocked: nothing persisted to clear.
  }
  queryClient.removeQueries({ type: 'inactive' });
  await queryClient.resetQueries();
}
