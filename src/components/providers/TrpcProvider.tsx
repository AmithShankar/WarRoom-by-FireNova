'use client';

import { useState } from 'react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { CACHE_BUSTER, deserializeCache, serializeCache } from '@/lib/query-persist';

const CACHE_MAX_AGE = 24 * 60 * 60_000;

let lastSignInToast = 0;

function isUnauthorized(err: unknown): boolean {
  const code = (err as { data?: { code?: string } } | null)?.data?.code;
  return code === 'UNAUTHORIZED';
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient]: [QueryClient, unknown] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (err) => {
            if (!isUnauthorized(err)) return;
            // Refresh auth.me so the editor UI drops away, and tell the user once.
            void queryClient.invalidateQueries({
              predicate: (q) => JSON.stringify((q.queryKey as unknown[])[0]) === '["auth","me"]',
            });
            const now = Date.now();
            if (now - lastSignInToast < 5000) return;
            lastSignInToast = now;
            toast.error('Your sign in has ended. Sign in again to make changes.');
          },
        }),
        defaultOptions: {
          queries: { staleTime: 60_000, gcTime: CACHE_MAX_AGE, refetchOnWindowFocus: false },
        },
      }),
  );
  const [persister] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      // Accessing localStorage throws when site data is blocked.
      return createSyncStoragePersister({
        storage: window.localStorage,
        key: 'warroom-cache',
        serialize: serializeCache,
        deserialize: (raw) => deserializeCache(raw) as PersistedClient,
      });
    } catch {
      return null;
    }
  });
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: '/api/trpc', transformer: superjson })],
    }),
  );
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {persister ? (
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: CACHE_MAX_AGE,
            buster: CACHE_BUSTER,
            dehydrateOptions: { shouldDehydrateMutation: () => false },
          }}
        >
          {children}
        </PersistQueryClientProvider>
      ) : (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )}
    </trpc.Provider>
  );
}
