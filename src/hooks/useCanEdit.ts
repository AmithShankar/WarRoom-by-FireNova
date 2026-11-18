'use client';

import { trpc } from '@/lib/trpc';

// True when the viewer may make changes. Until auth.me has data (fresh or restored
// from the persisted cache) this is false, so editing controls never flash for viewers.
export function useCanEdit(): boolean {
  const me = trpc.auth.me.useQuery();
  return me.data?.canEdit ?? false;
}
