'use client';

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';

export interface AddPlayerComboboxProps {
  available: Player[];
  disabled?: boolean;
  onAdd: (playerTag: string) => void;
}

export function AddPlayerCombobox({ available, disabled, onAdd }: AddPlayerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? available.filter(p => p.name.toLowerCase().includes(q))
      : available;
    return [...list].sort(
      (a, b) => b.townHallLevel - a.townHallLevel || a.name.localeCompare(b.name),
    );
  }, [available, query]);

  const isDisabled = disabled || available.length === 0;

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isDisabled}
          className={cn(
            'flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border-1 bg-surface-1 px-3 text-sm text-text-1 transition-colors hover:border-border-strong',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Plus className="h-4 w-4" /> Add player
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="relative border-b border-border-1 p-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <Input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search available players…"
            className="pl-9"
          />
        </div>
        <div className="max-h-64 overflow-auto p-1">
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-text-3">
              No available players.
            </div>
          )}
          {results.map(p => (
            <button
              key={p.playerTag}
              type="button"
              onClick={() => { onAdd(p.playerTag); setOpen(false); setQuery(''); }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-2"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-surface-3 font-mono text-[10px] text-text-1">
                {p.townHallLevel}
              </span>
              <span className="min-w-0 flex-1 truncate text-text-1">{p.name}</span>
              <span className="font-mono text-[10px] text-text-3">{p.role}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
