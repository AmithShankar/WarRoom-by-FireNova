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
    onSuccess: () => {
      utils.roster.list.invalidate();
      utils.cwl.board.invalidate();
      utils.dashboard.overview.invalidate();
      utils.dashboard.currentWar.invalidate();
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
