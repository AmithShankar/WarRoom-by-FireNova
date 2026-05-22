"use client";

import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/types";
import { DraggablePlayerCard } from "./DraggablePlayerCard";

export interface WarSlotProps {
  slot: number;
  player: Player | null;
  selected: Set<string>;
  onToggleSelect: (tag: string) => void;
}

export const WarSlot = memo(function WarSlot({
  slot,
  player,
  selected,
  onToggleSelect,
}: WarSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-drop:${slot}`,
    data: { kind: "slot" as const, slot },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex min-h-24 flex-col gap-2 rounded-xl border p-2 transition-colors",
        isOver
          ? "border-brand-to bg-brand-to/5"
          : "border-border-1 bg-surface-2/30 hover:border-border-strong",
      )}
    >
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-text-3">
        <span>Slot</span>
        <span className="grid h-5 w-5 place-items-center rounded-md bg-surface-3 font-mono text-[10px] text-text-1">
          {slot}
        </span>
      </div>
      {player ? (
        <DraggablePlayerCard
          id={`slot:${player.playerTag}`}
          data={{ from: "slot", slot, playerTag: player.playerTag }}
          player={player}
          selected={selected.has(player.playerTag)}
          onToggleSelect={onToggleSelect}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-1 px-2 py-3 text-[10px] uppercase tracking-wider text-text-3">
          <Crosshair className="h-3 w-3" />
          Empty
        </div>
      )}
    </div>
  );
});
