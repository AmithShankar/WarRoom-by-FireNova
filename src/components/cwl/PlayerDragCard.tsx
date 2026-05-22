'use client';

import { memo } from 'react';
import { GripVertical, ShieldAlert, Star, Swords, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';
import { ThBadge } from '@/components/roster/ThBadge';
import { RoleBadge } from '@/components/roster/RoleBadge';
import { Checkbox } from '@/components/ui/checkbox';

export interface PlayerDragCardProps {
  player: Player;
  dragging?: boolean;
  selected?: boolean;
  onToggleSelect?: (tag: string) => void;
}

export const PlayerDragCard = memo(function PlayerDragCard({
  player, dragging, selected, onToggleSelect,
}: PlayerDragCardProps) {
  const needsAttention = !player.postedChallenge;
  return (
    <div
      className={cn(
        'group relative flex items-start gap-2 rounded-xl border bg-surface-1 p-2.5 transition-all',
        dragging
          ? 'drag-glow border-brand-to'
          : selected
          ? 'border-brand-from ring-1 ring-brand-from/40'
          : 'border-border-1 hover:border-border-strong',
      )}
    >
      {onToggleSelect && (
        <div
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        >
          <Checkbox
            checked={!!selected}
            onCheckedChange={() => onToggleSelect(player.playerTag)}
            aria-label={`Select ${player.name}`}
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-text-1">{player.name}</span>
          <ThBadge level={player.townHallLevel} />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <RoleBadge role={player.role} compact />
          {needsAttention && (
            <span
              title="Awaiting challenge"
              className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400"
            >
              <ShieldAlert className="h-3 w-3" /> Challenge
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-3 font-mono text-[11px] text-text-2">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 text-brand-from" /> {player.cwlStats.stars}
          </span>
          <span className="inline-flex items-center gap-1">
            <Target className="h-3 w-3 text-text-3" /> {player.cwlStats.destructionPercentage.toFixed(0)}%
          </span>
          <span className="inline-flex items-center gap-1">
            <Swords className="h-3 w-3 text-text-3" /> {player.cwlStats.attacksUsed}/7
          </span>
        </div>
      </div>
      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-text-3 group-hover:text-text-2" />
    </div>
  );
});
