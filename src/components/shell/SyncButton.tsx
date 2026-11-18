'use client';

import { useEffect, useRef } from 'react';
import { useIsRestoring } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { isStale } from '@/lib/sync-timing';

export function SyncButton() {
  const utils = trpc.useUtils();
  const status = trpc.sync.status.useQuery();
  const run = trpc.sync.run.useMutation({
    onSuccess: (res) => {
      if (res.skipped && res.reason === 'cooldown') toast.info('Synced recently. Try again in a few minutes.');
    },
    onMutate: async () => {
      // Cancel any in-flight dashboard queries so they don't race with the sync.
      await Promise.all([
        utils.dashboard.overview.cancel(),
        utils.dashboard.currentWar.cancel(),
        utils.dashboard.activity.cancel(),
        utils.dashboard.lastWar.cancel(),
        utils.sync.status.cancel(),
      ]);
    },
    onSettled: () => {
      utils.roster.list.invalidate();
      utils.cwl.board.invalidate();
      utils.dashboard.overview.invalidate();
      utils.dashboard.currentWar.invalidate();
      utils.dashboard.activity.invalidate();
      utils.dashboard.lastWar.invalidate();
      utils.sync.status.invalidate();
    },
  });

  // Sync once per app open when the data is stale, after the status first loads.
  const isRestoring = useIsRestoring();
  const autoSynced = useRef(false);
  useEffect(() => {
    // Wait for the persisted cache restore and a fresh status fetch before deciding.
    if (autoSynced.current || isRestoring || !status.isFetchedAfterMount || status.isFetching || run.isPending) return;
    autoSynced.current = true;
    if (status.isSuccess && isStale(status.data?.finishedAt ? new Date(status.data.finishedAt) : null, new Date())) {
      run.mutate();
    }
  }, [isRestoring, status.isFetchedAfterMount, status.isFetching, status.isSuccess, status.data, run]);

  const last = status.data?.finishedAt;
  return (
    <Button
      variant="subtle"
      size="sm"
      onClick={() => run.mutate()}
      disabled={run.isPending}
      title={last ? `Last synced ${formatDistanceToNowStrict(new Date(last), { addSuffix: true })}` : 'Never synced'}
    >
      <RefreshCw className={cn('h-4 w-4', run.isPending && 'animate-spin')} />
      <span className="hidden md:inline">{run.isPending ? 'Syncing…' : 'Refresh'}</span>
    </Button>
  );
}
