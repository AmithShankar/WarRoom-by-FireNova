'use client';

import { ListPlus, Users, UserX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BulkActionBarProps {
  count: number;
  lineupFull: boolean;
  onAddToLineup: () => void;
  onMoveToAvailable: () => void;
  onMoveToExcluded: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  count, lineupFull, onAddToLineup, onMoveToAvailable, onMoveToExcluded, onClear,
}: BulkActionBarProps) {
  return (
    <div
      role="region"
      aria-label="Bulk player actions"
      className="fixed inset-x-4 bottom-20 z-40 md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2"
    >
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-1 bg-surface-1/95 p-2 shadow-lg backdrop-blur md:flex-nowrap">
        <span aria-live="polite" className="px-2 font-mono text-xs text-text-2">{count} selected</span>
        <Button size="sm" variant="subtle" onClick={onAddToLineup} disabled={lineupFull}>
          <ListPlus className="h-4 w-4" /> Add to Lineup
        </Button>
        <Button size="sm" variant="subtle" onClick={onMoveToAvailable}>
          <Users className="h-4 w-4" /> Available
        </Button>
        <Button size="sm" variant="subtle" onClick={onMoveToExcluded}>
          <UserX className="h-4 w-4" /> Will NOT Play
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear} aria-label="Clear selection">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
