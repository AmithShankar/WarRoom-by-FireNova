'use client';

import { memo, useState } from 'react';
import { UserMinus, AlertTriangle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import type { Player } from '@/lib/types';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { ThBadge } from './ThBadge';
import { RoleBadge } from './RoleBadge';
import { StatusBadge } from './StatusBadge';

export interface KickSheetProps {
  player: Player | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKick: (tag: string, reason: string) => void;
}

export const KickSheet = memo(function KickSheet({
  player, open, onOpenChange, onKick,
}: KickSheetProps) {
  const isDesktop = useIsDesktop();
  const [reason, setReason] = useState('');

  if (!player) return null;

  const trimmed = reason.trim();

  const submit = () => {
    if (!trimmed) return;
    onKick(player.playerTag, trimmed);
    setReason('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className="p-0 sm:max-w-lg"
        aria-describedby={undefined}
      >
        <SheetHeader className="px-5 pt-5">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <SheetTitle className="truncate">Remove from Clan</SheetTitle>
              <SheetDescription className="font-mono text-[11px]">
                {player.name} · {player.playerTag}
              </SheetDescription>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <ThBadge level={player.townHallLevel} />
              <RoleBadge role={player.role} compact />
              <StatusBadge status={player.status} />
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-5 py-5">
          <div className="flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              This removes <span className="font-semibold">{player.name}</span> from the active
              roster. They will appear under Historical Members.
            </span>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-text-3">
              Reason for removal
            </label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Repeated missed war attacks, inactivity, behavior…"
              rows={4}
            />
            {!trimmed && (
              <p className="mt-1 text-[11px] text-text-3">A reason is required.</p>
            )}
          </div>
        </div>

        <SheetFooter className="px-5 pb-5">
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
          <Button variant="danger" onClick={submit} disabled={!trimmed}>
            <UserMinus className="h-4 w-4" /> Remove from Clan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
