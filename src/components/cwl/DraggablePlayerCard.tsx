'use client';

import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Player } from '@/lib/types';
import { PlayerDragCard } from './PlayerDragCard';

export interface DraggablePlayerCardProps {
  id: string;
  data: Record<string, unknown>;
  player: Player;
  selected: boolean;
  onToggleSelect: (tag: string) => void;
}

/**
 * A draggable wrapper around `PlayerDragCard`. Shared by `WarSlot` (slot cards)
 * and `CwlPanel` (pool cards) - only the `id` and `data` payload differ.
 */
export const DraggablePlayerCard = memo(function DraggablePlayerCard({
  id, data, player, selected, onToggleSelect,
}: DraggablePlayerCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <PlayerDragCard player={player} selected={selected} onToggleSelect={onToggleSelect} />
    </div>
  );
});
