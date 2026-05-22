'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export interface ResetLineupButtonProps {
  onReset: () => void;
}

export function ResetLineupButton({ onReset }: ResetLineupButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border-1 bg-surface-1 px-3 text-sm text-text-2 transition-colors hover:border-border-strong hover:text-text-1"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-text-1">Reset the board?</div>
            <p className="mt-0.5 text-[11px] text-text-3">
              Clears all 15 slots and the Will NOT Play list. Every member returns
              to Available. This cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => { onReset(); setOpen(false); }}
            >
              Reset board
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
