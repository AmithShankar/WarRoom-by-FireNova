'use client';

import { useMemo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Player, PlayerStatus, Role } from '@/lib/types';
import { type RosterFilters, type ChallengeFilter, deriveFilterCounts } from '@/lib/roster-filters';

const ROLES: Role[] = ['Leader', 'Co-Leader', 'Elder', 'Member'];
const STATUSES: PlayerStatus[] = ['New', 'Staying', 'Warned'];
const CHALLENGES: ChallengeFilter[] = ['Posted', 'Not Posted'];

function MultiSelect<T extends string>({
  label, options, selected, onChange,
}: {
  label: string;
  options: { value: T; count: number }[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const allSelected = selected.length === 0;
  const trigger = allSelected
    ? `All ${label}`
    : selected.length === 1 ? String(selected[0]) : `${selected.length} selected`;
  const toggle = (v: T) => {
    const next = selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v];
    onChange(next);
  };
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-from/30',
            allSelected
              ? 'border-border-1 bg-surface-1 text-text-1 hover:border-border-strong'
              : 'border-brand-from/40 bg-brand-from/10 font-medium text-brand-from',
          )}
        >
          {trigger}
          <ChevronDown className="h-4 w-4 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        <DropdownMenuItem onSelect={e => { e.preventDefault(); onChange([]); }}>
          <span className={cn('flex h-4 w-4 items-center justify-center', allSelected ? 'text-brand-from' : 'opacity-0')}>
            <Check className="h-4 w-4" />
          </span>
          All {label}
        </DropdownMenuItem>
        {options.map(opt => {
          const checked = selected.includes(opt.value);
          return (
            <DropdownMenuItem
              key={String(opt.value)}
              onSelect={e => { e.preventDefault(); toggle(opt.value); }}
            >
              <span className={cn('flex h-4 w-4 items-center justify-center', checked ? 'text-brand-from' : 'opacity-0')}>
                <Check className="h-4 w-4" />
              </span>
              <span className="flex-1">{String(opt.value)}</span>
              <span className="font-mono text-[11px] text-text-3">{opt.count}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface RosterFilterBarProps {
  players: Player[]; // full active roster, for counts
  filters: RosterFilters;
  onChange: (f: RosterFilters) => void;
  shownCount: number;
  totalCount: number;
}

export function RosterFilterBar({
  players, filters, onChange, shownCount, totalCount,
}: RosterFilterBarProps) {
  const counts = useMemo(() => deriveFilterCounts(players), [players]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelect
        label="statuses"
        options={STATUSES.map(s => ({ value: s, count: counts.status[s] ?? 0 }))}
        selected={filters.status}
        onChange={status => onChange({ ...filters, status: status as PlayerStatus[] })}
      />
      <MultiSelect
        label="roles"
        options={ROLES.map(r => ({ value: r, count: counts.role[r] ?? 0 }))}
        selected={filters.role}
        onChange={role => onChange({ ...filters, role: role as Role[] })}
      />
      <MultiSelect
        label="town halls"
        options={counts.th.map(t => ({ value: `TH${t.value}`, count: t.count }))}
        selected={filters.th.map(n => `TH${n}`)}
        onChange={vals => onChange({ ...filters, th: vals.map(v => Number(v.slice(2))) })}
      />
      <MultiSelect
        label="challenge"
        options={CHALLENGES.map(c => ({ value: c, count: counts.challenge[c] }))}
        selected={filters.challenge}
        onChange={challenge => onChange({ ...filters, challenge: challenge as ChallengeFilter[] })}
      />
      <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-text-3">
        Showing {shownCount} of {totalCount}
      </span>
    </div>
  );
}
