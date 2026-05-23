'use client';

import { memo, useMemo, useState } from 'react';
import { addHours, format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
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
import { Input, Textarea } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Player, WarningReason, WarWarningContext } from '@/lib/types';
import type { IssueWarningInput } from '@/hooks/useRosterData';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { ThBadge } from './ThBadge';
import { RoleBadge } from './RoleBadge';
import { StatusBadge } from './StatusBadge';

const REASONS: WarningReason[] = [
  'Failed Initial Challenge',
  'Missed War Attack',
  'Low Donations',
  'Behavior',
  'Other',
];

export interface WarningSheetProps {
  player: Player | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWarn: (input: IssueWarningInput) => void;
}

export const WarningSheet = memo(function WarningSheet({
  player, open, onOpenChange, onWarn,
}: WarningSheetProps) {
  const isDesktop = useIsDesktop();

  const [date, setDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [duration, setDuration] = useState<number | null>(48);
  const [reason, setReason] = useState<WarningReason>('Missed War Attack');
  const [notes, setNotes] = useState('');
  const [ctx, setCtx] = useState<WarWarningContext>({
    warPerfected: false,
    mirrorCleared: false,
    thLevelCleared: false,
  });

  const expiration = useMemo(() => {
    if (duration == null) return null;
    const base = date ? new Date(`${date}T${format(new Date(), 'HH:mm:ss')}`) : new Date();
    return addHours(base, duration);
  }, [date, duration]);

  const isMissedWar = reason === 'Missed War Attack';
  const isFailedChallenge = reason === 'Failed Initial Challenge';

  if (!player) return null;

  const submit = () => {
    if (isFailedChallenge && duration == null) return;
    onWarn({
      playerTag: player.playerTag,
      date: new Date(`${date}T${format(new Date(), 'HH:mm:ss')}`),
      durationHours: duration,
      reason,
      notes,
      context: isMissedWar ? ctx : undefined,
    });
    setNotes('');
    setReason('Missed War Attack');
    setDuration(48);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setCtx({ warPerfected: false, mirrorCleared: false, thLevelCleared: false });
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
              <SheetTitle className="truncate">Issue Warning</SheetTitle>
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
          <div className="rounded-xl border border-border-1 bg-surface-1 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Date">
                <DatePicker value={date} onChange={setDate} />
              </Field>

              <Field label={`Duration (hours) · ${isFailedChallenge ? 'required' : 'optional'}`}>
                <Input
                  type="number"
                  min={1}
                  placeholder={isFailedChallenge ? 'Required' : 'No expiry'}
                  value={duration ?? ''}
                  onChange={e => {
                    const v = e.target.value.trim();
                    setDuration(v === '' ? null : Number(v) || null);
                  }}
                />
                <div className="mt-2 flex gap-2">
                  {[48, 72].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setDuration(h)}
                      className={cn(
                        'cursor-pointer rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors',
                        duration === h
                          ? 'border-brand-from/40 bg-brand-from/15 text-brand-from'
                          : 'border-border-1 bg-surface-1 text-text-2 hover:bg-surface-2',
                      )}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Reason" className="sm:col-span-2">
                <Select value={reason} onValueChange={v => setReason(v as WarningReason)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Notes" className="sm:col-span-2">
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Context, evidence, leadership rationale…"
                  rows={3}
                />
              </Field>
            </div>

            {isMissedWar && (
              <div className="mt-4 rounded-lg border border-border-strong bg-surface-3 p-3">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-2">
                  War context
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(
                    [
                      ['warPerfected', 'War Perfected'],
                      ['mirrorCleared', 'Mirror Cleared'],
                      ['thLevelCleared', 'TH Level Cleared'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border-1 bg-surface-1 px-2 py-1.5 text-xs text-text-2 hover:border-border-strong"
                    >
                      <Checkbox
                        checked={ctx[key]}
                        onCheckedChange={(v) => setCtx(p => ({ ...p, [key]: v === true }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {isFailedChallenge && (
              <div className="mt-4 flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Player will be flagged for{' '}
                  <span className="font-semibold">automatic kick</span> upon expiration.
                </span>
              </div>
            )}

            {expiration && (
              <div className="mt-4 flex items-center justify-between rounded-md border border-border-1 bg-surface-2 px-3 py-2">
                <span className="text-[11px] uppercase tracking-wider text-text-3">Expires</span>
                <span className="font-mono text-sm text-brand-from">
                  {format(expiration, 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="px-5 pb-5">
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
          <Button onClick={submit} disabled={isFailedChallenge && duration == null}>
            <AlertTriangle className="h-4 w-4" /> Issue Warning
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function Field({
  label, children, className,
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-text-3">
        {label}
      </label>
      {children}
    </div>
  );
}
