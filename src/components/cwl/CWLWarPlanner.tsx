'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { mapBoardPlayer } from '@/hooks/mappers';
import { CWL_WAR_SIZE } from '@/lib/types';
import type { Player } from '@/lib/types';
import { WarSlot } from './WarSlot';
import { CwlPanel } from './CwlPanel';
import { BulkActionBar } from './BulkActionBar';
import { PlayerDragCard } from './PlayerDragCard';
import { AddPlayerCombobox } from './AddPlayerCombobox';
import { ResetLineupButton } from './ResetLineupButton';
import { CwlSkeleton } from '@/components/skeletons/PageSkeletons';
import { QueryError } from '@/components/ui/QueryError';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Prefer a specific droppable (a slot or a panel) over the wrapping lineup
// grid. When the pointer is in a gap between slots, only the grid matches -
// that drop auto-fills the next empty slot. When the pointer is outside every
// droppable, fall back to closestCenter so drops stay forgiving.
const cwlCollisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  const specific = within.filter(c => c.id !== 'lineup-grid');
  if (specific.length > 0) return specific;
  if (within.length > 0) return within;
  return closestCenter(args);
};

function LineupGrid({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'lineup-grid',
    data: { kind: 'lineup' as const },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'grid grid-cols-1 gap-2.5 px-4 pb-4 transition-colors sm:grid-cols-3 md:grid-cols-5 md:px-5 md:pb-5',
        isOver && 'bg-brand-to/5',
      )}
    >
      {children}
    </div>
  );
}

export function CWLWarPlanner() {
  const utils = trpc.useUtils();
  const board = trpc.cwl.board.useQuery();

  const bulkMove = trpc.cwl.bulkMove.useMutation({
    onSuccess: () => utils.cwl.board.invalidate(),
    onError: () => toast.error("Couldn't move players. Please try again."),
  });
  const addToLineup = trpc.cwl.addToLineup.useMutation({
    onSuccess: () => utils.cwl.board.invalidate(),
    onError: (err) => toast.error(err.message.includes('full') ? 'The lineup is already full (15/15).' : "Couldn't add player. Please try again."),
  });
  const reorderLineup = trpc.cwl.reorderLineup.useMutation({
    onSuccess: () => utils.cwl.board.invalidate(),
    onError: () => toast.error("Couldn't reorder the lineup. Please try again."),
  });
  const resetBoard = trpc.cwl.reset.useMutation({
    onSuccess: () => {
      utils.cwl.board.invalidate();
      setSelected(new Set());
    },
    onError: () => toast.error("Couldn't reset the lineup. Please try again."),
  });

  const lineup = useMemo(() => (board.data?.lineup ?? []).map(mapBoardPlayer), [board.data]);
  const availablePlayers = useMemo(
    () => (board.data?.available ?? []).map(mapBoardPlayer),
    [board.data],
  );
  const excludedPlayers = useMemo(
    () => (board.data?.excluded ?? []).map(mapBoardPlayer),
    [board.data],
  );

  // slot number → playerTag (or null), derived from each lineup player's cwlSlot.
  const warSlots = useMemo<Record<number, string | null>>(() => {
    const slots: Record<number, string | null> = {};
    for (let s = 1; s <= CWL_WAR_SIZE; s++) slots[s] = null;
    for (const row of board.data?.lineup ?? []) {
      if (row.cwlSlot != null) slots[row.cwlSlot] = row.playerTag;
    }
    return slots;
  }, [board.data]);

  const playerByTag = useMemo(
    () => new Map<string, Player>([...lineup, ...availablePlayers, ...excludedPlayers].map(p => [p.playerTag, p])),
    [lineup, availablePlayers, excludedPlayers],
  );
  const slotNumbers = useMemo(
    () => Array.from({ length: CWL_WAR_SIZE }, (_, i) => i + 1),
    [],
  );

  // Lineup player tags in current slot order (slot 1 first).
  const orderedLineupTags = useMemo(
    () => slotNumbers.map(s => warSlots[s]).filter((t): t is string => t != null),
    [slotNumbers, warSlots],
  );

  const placedCount = lineup.length;
  const lineupFull = placedCount >= CWL_WAR_SIZE;

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeDragTag, setActiveDragTag] = useState<string | null>(null);
  const draggingPlayer = activeDragTag ? playerByTag.get(activeDragTag) ?? null : null;

  const toggleSelect = useCallback((tag: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const bulkMoveToLineup = useCallback(
    (tags: string[]) => bulkMove.mutate({ playerTags: tags, target: 'lineup' }),
    [bulkMove],
  );
  const bulkMoveToAvailable = useCallback(
    (tags: string[]) => bulkMove.mutate({ playerTags: tags, target: 'available' }),
    [bulkMove],
  );
  const bulkMoveToExcluded = useCallback(
    (tags: string[]) => bulkMove.mutate({ playerTags: tags, target: 'excluded' }),
    [bulkMove],
  );

  const runBulk = useCallback(
    (fn: (tags: string[]) => void) => {
      fn([...selected]);
      setSelected(new Set());
    },
    [selected],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const handleStart = useCallback((e: DragStartEvent) => {
    const tag = (e.active.data.current as { playerTag?: string } | undefined)?.playerTag;
    setActiveDragTag(tag ?? null);
  }, []);

  const handleEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveDragTag(null);
      const tag = (e.active.data.current as { playerTag?: string } | undefined)?.playerTag;
      if (!tag || !e.over) return;
      const over = e.over.data.current as { kind?: string; slot?: number } | undefined;
      if (!over) return;
      if (over.kind === 'slot' && typeof over.slot === 'number') {
        const inLineup = orderedLineupTags.includes(tag);
        if (inLineup) {
          const without = orderedLineupTags.filter(t => t !== tag);
          const insertAt = Math.min(over.slot - 1, without.length);
          without.splice(insertAt, 0, tag);
          reorderLineup.mutate({ orderedTags: without });
        } else {
          addToLineup.mutate({ playerTag: tag });
        }
      } else if (over.kind === 'lineup') {
        if (!orderedLineupTags.includes(tag)) addToLineup.mutate({ playerTag: tag });
      } else if (over.kind === 'available') {
        bulkMoveToAvailable([tag]);
      } else if (over.kind === 'excluded') {
        bulkMoveToExcluded([tag]);
      }
    },
    [orderedLineupTags, addToLineup, reorderLineup, bulkMoveToAvailable, bulkMoveToExcluded],
  );

  if (board.isError) return <QueryError message="Couldn't load the CWL lineup. Check your connection and try again." onRetry={() => board.refetch()} />;
  if (board.isLoading) return <CwlSkeleton />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={cwlCollisionDetection}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
    >
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>War Lineup</CardTitle>
                <CardDescription>
                  Add players with the dropdown - the lineup auto-sorts by Town
                  Hall. Drag to fine-tune the order; do manual tweaks last.
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px]',
                    placedCount === CWL_WAR_SIZE
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                      : 'border-border-1 bg-surface-2 text-text-2',
                  )}
                >
                  {placedCount}/{CWL_WAR_SIZE} placed
                </span>
                <AddPlayerCombobox
                  available={availablePlayers}
                  disabled={lineupFull}
                  onAdd={tag => addToLineup.mutate({ playerTag: tag })}
                />
                <ResetLineupButton onReset={() => resetBoard.mutate()} />
              </div>
            </div>
          </CardHeader>
          <LineupGrid>
            {slotNumbers.map(slot => {
              const tag = warSlots[slot];
              const player = tag ? playerByTag.get(tag) ?? null : null;
              return (
                <WarSlot
                  key={slot}
                  slot={slot}
                  player={player}
                  selected={selected}
                  onToggleSelect={toggleSelect}
                />
              );
            })}
          </LineupGrid>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CwlPanel
            title="Available"
            kind="available"
            players={availablePlayers}
            selected={selected}
            onToggleSelect={toggleSelect}
            search={search}
            onSearchChange={setSearch}
          />
          <CwlPanel
            title="Will NOT Play CWL"
            kind="excluded"
            players={excludedPlayers}
            selected={selected}
            onToggleSelect={toggleSelect}
          />
        </div>
      </div>

      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          lineupFull={lineupFull}
          onAddToLineup={() => runBulk(bulkMoveToLineup)}
          onMoveToAvailable={() => runBulk(bulkMoveToAvailable)}
          onMoveToExcluded={() => runBulk(bulkMoveToExcluded)}
          onClear={clearSelection}
        />
      )}

      <DragOverlay dropAnimation={null}>
        {draggingPlayer ? <PlayerDragCard player={draggingPlayer} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
