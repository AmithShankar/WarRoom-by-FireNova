'use client';

import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { PlayerStatus } from '@/lib/types';

interface StatusFilterProps {
  options: PlayerStatus[];
  selected: PlayerStatus[];
  onChange: (selected: PlayerStatus[]) => void;
  className?: string;
}

export function StatusFilter({ options, selected, onChange, className }: StatusFilterProps) {
  // An empty selection means "no filter" (all rows shown).
  const allSelected = selected.length === 0;
  const label = allSelected
    ? 'All statuses'
    : selected.length === 1
    ? selected[0]
    : `${selected.length} selected`;

  const toggle = (status: PlayerStatus) => {
    const next = selected.includes(status)
      ? selected.filter(s => s !== status)
      : [...selected, status];
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
            className,
          )}
        >
          {label}
          <ChevronDown className="h-4 w-4 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuItem onSelect={e => { e.preventDefault(); onChange([]); }}>
          <span className={cn('flex h-4 w-4 items-center justify-center', allSelected ? 'text-brand-from' : 'opacity-0')}>
            <Check className="h-4 w-4" />
          </span>
          All statuses
        </DropdownMenuItem>
        {options.map(status => {
          const checked = selected.includes(status);
          return (
            <DropdownMenuItem
              key={status}
              onSelect={e => { e.preventDefault(); toggle(status); }}
            >
              <span className={cn('flex h-4 w-4 items-center justify-center', checked ? 'text-brand-from' : 'opacity-0')}>
                <Check className="h-4 w-4" />
              </span>
              {status}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
