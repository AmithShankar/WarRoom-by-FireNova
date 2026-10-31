'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { trpc } from '@/lib/trpc';
import { CACHE_BUSTER, deserializeCache, serializeCache } from '@/lib/query-persist';

const CACHE_MAX_AGE = 24 * 60 * 60_000;

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
