'use client';

import { Swords } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export function WarStatusChip() {
  const war = trpc.dashboard.currentWar.useQuery();

  const state = war.data?.state;
  const label =
    state === 'battle' ? 'Battle Day'
    : state === 'preparation' ? 'Preparation'
    : state === 'ended' ? 'War Ended'
    : 'No active war';

  const tone =
    state === 'battle'
      ? 'border-brand-from/30 bg-brand-from/10 text-brand-from'
      : state === 'preparation'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : 'border-border-1 bg-surface-2 text-text-2';

  return (
    <span
      className={cn(
        'hidden items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider sm:inline-flex',
        tone,
      )}
    >
      <Swords className="h-3 w-3" /> {label}
    </span>
  );
}
