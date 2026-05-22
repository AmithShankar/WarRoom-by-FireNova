'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, Check, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';
import type { DuplicateMode, ImportResult, ImportRow } from '@/lib/import-export/types';
import { ImportExportMenu } from './ImportExportMenu';
import { StatusBadge } from './StatusBadge';
import { ThBadge } from './ThBadge';
import { RoleBadge } from './RoleBadge';
import { PlayerActionMenu } from './PlayerActionMenu';

export interface RosterTableProps {
  data: Player[];
  onRowClick: (p: Player) => void;
  onWarnDirect: (p: Player) => void;
  onKick: (p: Player) => void;
  onSetChallenge: (p: Player) => void;
  onImport: (rows: ImportRow[], mode: DuplicateMode) => ImportResult;
}

export const RosterTable = memo(function RosterTable({
  data, onRowClick, onWarnDirect, onKick, onSetChallenge, onImport,
}: RosterTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const handleView = useCallback((p: Player) => onRowClick(p), [onRowClick]);

  const columns = useMemo<ColumnDef<Player>[]>(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="inline-flex items-center gap-1 text-left text-[10px] uppercase tracking-wider text-text-3 transition-colors hover:text-text-1"
        >
          Player <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-text-1">{row.original.name}</span>
          <span className="font-mono text-[10px] text-text-3">{row.original.playerTag}</span>
        </div>
      ),
    },
    {
      id: 'role',
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: 'townHallLevel',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-3 hover:text-text-1"
        >
          TH <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => <ThBadge level={row.original.townHallLevel} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'postedChallenge',
      header: 'Challenge',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onSetChallenge(row.original); }}
          aria-label={
            row.original.postedChallenge
              ? `Mark challenge not posted for ${row.original.name}`
              : `Mark challenge posted for ${row.original.name}`
          }
          className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-surface-3"
        >
          {row.original.postedChallenge ? (
            <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <X className="h-4 w-4 text-red-500" />
          )}
        </button>
      ),
    },
    {
      id: 'cwlStars',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting()}
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-3 hover:text-text-1"
        >
          CWL ★ <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      accessorFn: row => row.cwlStats.stars,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-text-1">
          {row.original.cwlStats.stars}
          <span className="text-text-3">/{(row.original.cwlStats.attacksUsed * 3) || 0}</span>
        </span>
      ),
    },
    {
      id: 'warnings',
      header: 'Warnings',
      accessorFn: row => row.warnings.length,
      cell: ({ row }) => {
        const count = row.original.warnings.length;
        return (
          <span
            className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 font-mono text-[11px]',
              count === 0
                ? 'bg-surface-2 text-text-3'
                : count === 1
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-red-500/15 text-red-500',
            )}
          >
            {count}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <PlayerActionMenu
          player={row.original}
          onView={handleView}
          onWarnDirect={onWarnDirect}
          onKick={onKick}
          onSetChallenge={onSetChallenge}
        />
      ),
    },
  ], [handleView, onWarnDirect, onKick, onSetChallenge]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <Input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search players, tags, status…"
            className="pl-9"
          />
        </div>
        <ImportExportMenu players={data} onImport={onImport} />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface-1/85 backdrop-blur">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-border-1">
                  {hg.headers.map(h => (
                    <th
                      key={h.id}
                      className="px-3 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-text-3"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map(row => {
                const p = row.original;
                const needsAttention = !p.postedChallenge && p.status !== 'Kicked' && p.status !== 'Left';
                return (
                  <tr
                    key={p.playerTag}
                    onClick={() => onRowClick(p)}
                    className={cn(
                      'cursor-pointer border-b border-border-1/60 transition-colors hover:bg-surface-3',
                      needsAttention && 'attention-row',
                    )}
                  >
                    {row.getVisibleCells().map(c => (
                      <td key={c.id} className="px-3 py-2.5 align-middle">
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-text-3">
                    No players match the current filters.
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
