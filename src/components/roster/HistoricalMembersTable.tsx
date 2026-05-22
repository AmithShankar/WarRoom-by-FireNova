"use client";

import { memo, useMemo, useState } from "react";
import { format } from "date-fns";
import { Search, UserMinus, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Player, PlayerStatus } from "@/lib/types";
import { ThBadge } from "./ThBadge";
import { StatusFilter } from "./StatusFilter";

const HISTORICAL_STATUSES: PlayerStatus[] = ["Kicked", "Left"];

export type ReclassifyFn = (
  playerTag: string,
  status: "Kicked" | "Left",
  reason?: string,
) => void;

export interface HistoricalMembersTableProps {
  data: Player[];
  onRowClick: (p: Player) => void;
  onReclassify: ReclassifyFn;
}

/** Per-row reclassify control. Left players can be marked Kicked (with an
 *  optional reason); Kicked players can be reverted to Left. */
const ReclassifyCell = memo(function ReclassifyCell({
  player,
  onReclassify,
}: {
  player: Player;
  onReclassify: ReclassifyFn;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (player.status === "Kicked") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReclassify(player.playerTag, "Left");
        }}
        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border-1 bg-surface-1 px-2 py-1 text-[11px] text-text-2 transition-colors hover:border-border-strong hover:bg-surface-2"
      >
        <RotateCcw className="h-3 w-3" /> Mark as Left
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-500 transition-colors hover:bg-red-500/20"
        >
          <UserMinus className="h-3 w-3" /> Mark as Kicked
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-text-1">
              Mark as Kicked
            </div>
            <p className="mt-0.5 text-[11px] text-text-3">
              Record that {player.name} was kicked rather than leaving
              voluntarily.
            </p>
          </div>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onReclassify(
                  player.playerTag,
                  "Kicked",
                  reason.trim() || undefined,
                );
                setReason("");
                setOpen(false);
              }}
            >
              Confirm Kicked
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

export const HistoricalMembersTable = memo(function HistoricalMembersTable({
  data,
  onRowClick,
  onReclassify,
}: HistoricalMembersTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlayerStatus[]>([]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = data.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.playerTag.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(p.status);
      return matchesQuery && matchesStatus;
    });
    // Most recent removal first; players without removedAt sort last.
    return [...filtered].sort((a, b) => {
      if (!a.removedAt && !b.removedAt) return 0;
      if (!a.removedAt) return 1;
      if (!b.removedAt) return -1;
      return b.removedAt.localeCompare(a.removedAt);
    });
  }, [data, query, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search historical members…"
            className="pl-9"
          />
        </div>
        <StatusFilter
          options={HISTORICAL_STATUSES}
          selected={statusFilter}
          onChange={setStatusFilter}
          className="w-36 md:w-40"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface-1/85 backdrop-blur">
              <tr className="border-b border-border-1">
                {["Player", "TH", "Removal", "Date", "Reason", "Action"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-text-3"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.playerTag}
                  onClick={() => onRowClick(p)}
                  className="cursor-pointer border-b border-border-1/60 transition-colors hover:bg-surface-3"
                >
                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-sm font-medium text-text-1">
                        {p.name}
                      </span>
                      <span className="font-mono text-[10px] text-text-3">
                        {p.playerTag}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <ThBadge level={p.townHallLevel} />
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                        p.status === "Kicked"
                          ? "bg-red-500/15 text-red-500"
                          : "bg-surface-3 text-text-2",
                      )}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-middle font-mono text-[11px] text-text-3">
                    {p.removedAt
                      ? format(new Date(p.removedAt), "yyyy-MM-dd HH:mm")
                      : "-"}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-sm text-text-2">
                    {p.status === "Kicked"
                      ? p.kickReason || "-"
                      : "Left voluntarily"}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <ReclassifyCell player={p} onReclassify={onReclassify} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-text-3"
                  >
                    No historical members.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
});
