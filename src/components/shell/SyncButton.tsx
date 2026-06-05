'use client';

import { RefreshCw } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export function SyncButton() {
  const utils = trpc.useUtils();
  const status = trpc.sync.status.useQuery();
  const run = trpc.sync.run.useMutation({
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
