'use client';

import { memo, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Search, Users, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';
import { DraggablePlayerCard } from './DraggablePlayerCard';

export interface CwlPanelProps {
  title: string;
  kind: 'available' | 'excluded';
  players: Player[];
  selected: Set<string>;
  onToggleSelect: (tag: string) => void;
  search?: string;
  onSearchChange?: (v: string) => void;
}

export const CwlPanel = memo(function CwlPanel({
  title, kind, players, selected, onToggleSelect, search, onSearchChange,
}: CwlPanelProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `panel-${kind}`,
    data: { kind },
  });

  const shown = useMemo(() => {
    const q = (search ?? '').trim().toLowerCase();
    const filtered = q
      ? players.filter(
          p =>
            p.name.toLowerCase().includes(q) ||
            p.playerTag.toLowerCase().includes(q),
        )
      : players;
    return [...filtered].sort((a, b) => b.townHallLevel - a.townHallLevel);
  }, [players, search]);

  const Icon = kind === 'available' ? Users : UserX;

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'rounded-2xl border bg-surface-1 p-4 transition-colors',
        isOver ? 'border-brand-to bg-brand-to/5' : 'border-border-1',
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-text-3" />
          <h3 className="text-sm font-semibold tracking-tight text-text-1">{title}</h3>
        </div>
        <span className="rounded-md border border-border-1 bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-text-2">
          {players.length}
        </span>
      </header>

      {onSearchChange && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <Input
            value={search ?? ''}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search players…"
            className="pl-9"
          />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-1 p-6 text-center text-xs text-text-3">
          {kind === 'available'
            ? 'No available players.'
            : 'No players marked “Will NOT play”.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(p => (
            <DraggablePlayerCard
              key={p.playerTag}
              id={`panel:${p.playerTag}`}
              data={{ from: 'panel', playerTag: p.playerTag }}
              player={p}
              selected={selected.has(p.playerTag)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
});
