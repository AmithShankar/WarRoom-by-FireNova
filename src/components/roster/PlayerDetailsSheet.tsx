'use client';

import { memo, useMemo, useState } from 'react';
import { addHours, format } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Clock,
  Crosshair,
  ShieldAlert,
  ShieldCheck,
  Star,
  Swords,
  Target,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Input, Textarea } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn, formatNumber, formatPercent } from '@/lib/utils';
import type { Player, Warning, WarningReason, WarWarningContext } from '@/lib/types';
import type { IssueWarningInput } from '@/hooks/useRosterData';
import { useIsDesktop, useNow } from '@/hooks/useMediaQuery';
import { StatusBadge } from './StatusBadge';
import { ThBadge } from './ThBadge';
import { RoleBadge } from './RoleBadge';

const REASONS: WarningReason[] = [
  'Failed Initial Challenge',
  'Missed War Attack',
  'Low Donations',
  'Behavior',
  'Other',
];

const reasonTone: Record<WarningReason, 'danger' | 'warning' | 'brand' | 'neutral'> = {
  'Failed Initial Challenge': 'danger',
  'Missed War Attack':        'warning',
  'Low Donations':            'warning',
  Behavior:                   'brand',
  Other:                      'neutral',
};

// --------------------------------------------------------------------------
// Memoized sub-pieces
// --------------------------------------------------------------------------

const StatTile = memo(function StatTile({
  icon: Icon, label, value, accent = 'text-text-1',
}: { icon: React.ElementType; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border-1 bg-surface-2/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-3">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={cn('mt-1 font-mono text-lg', accent)}>{value}</div>
    </div>
  );
});

const WarningTimelineItem = memo(function WarningTimelineItem({ w, now }: { w: Warning; now: number }) {
  const expired = w.expirationDate
    ? new Date(w.expirationDate).getTime() < now
    : false;
  return (
    <li className="relative pl-6">
      <span
        className={cn(
          'absolute left-1 top-2 h-2.5 w-2.5 rounded-full ring-4',
          expired ? 'bg-text-3 ring-surface-2' : 'bg-amber-400 ring-amber-400/20',
        )}
      />
      <div className="rounded-xl border border-border-1 bg-surface-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <Badge tone={reasonTone[w.reason]}>{w.reason}</Badge>
          <span className="font-mono text-[10px] text-text-3">
            {format(new Date(w.date), 'yyyy-MM-dd HH:mm')}
          </span>
        </div>
        {w.notes && <p className="mt-2 text-sm text-text-2">{w.notes}</p>}
        {w.context && (
          <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[10px]">
            {(
              [
                ['warPerfected', 'perfect'],
                ['mirrorCleared', 'mirror'],
                ['thLevelCleared', 'th-cleared'],
              ] as const
            ).map(([key, label]) => (
              <span
                key={key}
                className={cn(
                  'rounded border px-1.5 py-0.5',
                  w.context![key]
                    ? 'border-emerald-500/30 text-emerald-500 dark:text-emerald-400'
                    : 'border-border-1 text-text-3',
                )}
              >
                {label}: {w.context![key] ? 'yes' : 'no'}
              </span>
            ))}
          </div>
        )}
        {w.expirationDate && (
          <div className="mt-2 flex items-center justify-between border-t border-border-1 pt-2 text-[11px]">
            <span className="font-mono text-text-3">+{w.durationHours}h</span>
            <span
              className={cn(
                'font-mono',
                expired ? 'text-text-3 line-through' : 'text-amber-500 dark:text-amber-400',
              )}
            >
              exp {format(new Date(w.expirationDate), 'yyyy-MM-dd HH:mm')}
            </span>
          </div>
        )}
      </div>
    </li>
  );
});

// --------------------------------------------------------------------------
// Main sheet
// --------------------------------------------------------------------------

export interface PlayerDetailsSheetProps {
  player: Player | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssueWarning: (input: IssueWarningInput) => void;
}

type WarLogEntry = {
  participationId: string;
  opponent: string;
  isCwl: boolean;
  result: 'win' | 'loss' | 'draw' | null;
  endTime: string | Date;
  attacksUsed: number;
  attacksTotal: number;
  starsEarned: number;
  missed: number;
  excused: boolean;
  excuseReason: string | null;
};

const WarLogRow = memo(function WarLogRow({
  war, onSetExcused,
}: {
  war: WarLogEntry;
  onSetExcused: (participationId: string, excused: boolean, reason?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-border-1 bg-surface-1 px-3 py-2 text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-text-1">{war.opponent}</span>
          <span className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[9px] uppercase text-text-3">
            {war.isCwl ? 'CWL' : 'War'}
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-3">
          {format(new Date(war.endTime), 'yyyy-MM-dd')} · {war.starsEarned}★ · {war.attacksUsed}/{war.attacksTotal}
        </span>
      </div>
      {war.missed > 0 && (
        war.excused ? (
          <button
            type="button"
            onClick={() => onSetExcused(war.participationId, false)}
            title={war.excuseReason ?? 'Excused'}
            className="shrink-0 cursor-pointer rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-600 dark:text-emerald-400"
          >
            Excused
          </button>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 cursor-pointer rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400"
              >
                Excuse miss
              </button>
            </PopoverTrigger>
            <PopoverContent align="end">
              <div className="space-y-3">
                <div className="text-sm font-medium text-text-1">Excuse this miss?</div>
                <Input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Reason (optional)"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => {
                      onSetExcused(war.participationId, true, reason.trim() || undefined);
                      setReason('');
                      setOpen(false);
                    }}
                  >
                    Excuse
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )
      )}
    </li>
  );
});

export function PlayerDetailsSheet({
  player, open, onOpenChange, onIssueWarning,
}: PlayerDetailsSheetProps) {
  const isDesktop = useIsDesktop();
  const now = useNow();

  const perf = trpc.performance.forPlayer.useQuery(
    { playerTag: player?.playerTag ?? '' },
    { enabled: !!player },
  );
  const combined = perf.data?.all;

  const activityQuery = trpc.dashboard.playerActivity.useQuery(
    { player: player?.name ?? '' },
    { enabled: !!player },
  );
  const recentActivity = activityQuery.data ?? [];

  const utils = trpc.useUtils();
  const warLog = trpc.performance.playerWars.useQuery(
    { playerTag: player?.playerTag ?? '' },
    { enabled: !!player },
  );
  const setExcused = trpc.performance.setExcused.useMutation({
    onSuccess: () => {
      if (!player) return;
      utils.performance.playerWars.invalidate({ playerTag: player.playerTag });
      utils.performance.forPlayer.invalidate({ playerTag: player.playerTag });
      utils.performance.leaderboard.invalidate();
    },
  });

  const setChallenge = trpc.roster.setChallenge.useMutation({
    onSuccess: () => utils.roster.list.invalidate(),
  });

  const [activityOpen, setActivityOpen] = useState(false);
  const [activityValue, setActivityValue] = useState('');

  const markStayingByActivity = trpc.roster.markStayingByActivity.useMutation({
    onSuccess: () => {
      utils.roster.list.invalidate();
      setActivityOpen(false);
      setActivityValue('');
    },
    onError: (err) => {
      console.error('[markStayingByActivity]', err);
      toast.error("Couldn't mark player as staying. Please try again.");
    },
  });

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
    onIssueWarning({
      playerTag: player.playerTag,
      date: new Date(`${date}T${format(new Date(), 'HH:mm:ss')}`),
      durationHours: duration,
      reason,
      notes,
      context: isMissedWar ? ctx : undefined,
    });
    setNotes('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className="p-0"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <div className="flex items-start justify-between gap-3 pr-10">
            <div className="min-w-0">
              <SheetTitle className="truncate">{player.name}</SheetTitle>
              <SheetDescription className="font-mono text-[11px]">{player.playerTag}</SheetDescription>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <ThBadge level={player.townHallLevel} />
              <RoleBadge role={player.role} compact />
              <StatusBadge status={player.status} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {player.postedChallenge ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Challenge posted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-3.5 w-3.5" /> Awaiting challenge
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <StatTile icon={Star}    label="War Stars"  value={String(combined?.totalStars ?? 0)} accent="text-brand-from" />
            <StatTile icon={Target}  label="Avg Dest."  value={`${(combined?.avgDestruction ?? 0).toFixed(1)}%`} />
            <StatTile icon={Swords}  label="Attacks"    value={`${combined?.attacksUsed ?? 0}/${combined?.attacksAvailable ?? 0}`} />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-5 py-5">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="warnings">Warnings</TabsTrigger>
              <TabsTrigger value="issue">Issue Warning</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-5">
              {(player.status === 'Kicked' || player.status === 'Left') && (
                <section>
                  <SectionLabel icon={AlertTriangle} label="Removal" />
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
                    <div className="font-medium text-red-500">
                      {player.status === 'Kicked' ? 'Kicked from clan' : 'Left voluntarily'}
                    </div>
                    {player.removedAt && (
                      <div className="mt-1 font-mono text-[11px] text-text-3">
                        {format(new Date(player.removedAt), 'yyyy-MM-dd HH:mm')}
                      </div>
                    )}
                    {player.status === 'Kicked' && player.kickReason && (
                      <p className="mt-2 text-text-2">{player.kickReason}</p>
                    )}
                  </div>
                </section>
              )}

              <section>
                <SectionLabel icon={Crosshair} label="War Performance" />
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <StatTile icon={Swords} label="Attacks"        value={`${combined?.attacksUsed ?? 0}/${combined?.attacksAvailable ?? 0}`} />
                  <StatTile icon={Star}   label="3★ Rate"        value={formatPercent(combined?.threeStarRate ?? 0, 0)} accent="text-emerald-500 dark:text-emerald-400" />
                  <StatTile icon={Target} label="Avg Destruction" value={`${(combined?.avgDestruction ?? 0).toFixed(1)}%`} />
                  <StatTile icon={AlertTriangle} label="Missed"  value={String(combined?.missedAttacks ?? 0)} accent="text-amber-500 dark:text-amber-400" />
                </div>
              </section>

              <section>
                <SectionLabel icon={Swords} label="War Log" />
                <ul className="space-y-2">
                  {(warLog.data ?? []).length === 0 && (
                    <li className="rounded-xl border border-dashed border-border-1 px-3 py-4 text-center text-sm text-text-3">
                      No wars recorded yet.
                    </li>
                  )}
                  {(warLog.data ?? []).map(w => (
                    <WarLogRow
                      key={w.participationId}
                      war={w}
                      onSetExcused={(id, excused, reason) =>
                        setExcused.mutate({ participationId: id, excused, reason })
                      }
                    />
                  ))}
                </ul>
              </section>

              <section>
                <SectionLabel icon={CalendarDays} label="Donations" />
                <div className="grid grid-cols-3 gap-2.5">
                  <StatTile icon={CalendarDays} label="Donated"  value={formatNumber(player.donations)} />
                  <StatTile icon={CalendarDays} label="Received" value={formatNumber(player.donationsReceived)} />
                  <StatTile
                    icon={CalendarDays}
                    label="Balance"
                    value={formatNumber(player.donations - player.donationsReceived)}
                    accent={
                      player.donations - player.donationsReceived >= 0
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-amber-500 dark:text-amber-400'
                    }
                  />
                </div>
              </section>

              {player.notes && (
                <section>
                  <SectionLabel icon={AlertTriangle} label="Leadership Notes" />
                  <p className="rounded-xl border border-border-1 bg-surface-2/40 p-3 text-sm text-text-2">
                    {player.notes}
                  </p>
                </section>
              )}

              <section>
                <SectionLabel icon={Clock} label="Recent Activity" />
                <ul className="space-y-2">
                  {recentActivity.length === 0 && (
                    <li className="rounded-xl border border-dashed border-border-1 px-3 py-4 text-center text-sm text-text-3">
                      No recent activity.
                    </li>
                  )}
                  {recentActivity.map(a => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border-1 bg-surface-1 px-3 py-2 text-sm"
                    >
                      <span className="text-text-2">{a.summary}</span>
                      <span className="font-mono text-[10px] text-text-3">
                        {format(new Date(a.date), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </TabsContent>

            {/* Warnings */}
            <TabsContent value="warnings">
              {player.warnings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-1 bg-surface-2/40 p-6 text-center text-sm text-text-3">
                  No warnings on record.
                </div>
              ) : (
                <ol className="relative space-y-3 border-l border-border-1 pl-3">
                  {player.warnings.map(w => <WarningTimelineItem key={w.id} w={w} now={now} />)}
                </ol>
              )}
            </TabsContent>

            {/* Issue */}
            <TabsContent value="issue">
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
                            'rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors',
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
                      Player will be flagged for <span className="font-semibold">automatic kick</span> upon expiration.
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
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="ghost" className="sm:w-auto">Cancel</Button>
          </SheetClose>
          {(player.status === 'New' || player.status === 'Warned') && (
            <Popover
              open={activityOpen}
              onOpenChange={(v) => {
                setActivityOpen(v);
                if (!v) setActivityValue('');
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="sm:w-auto border-sky-500/40 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400"
                  disabled={markStayingByActivity.isPending}
                >
                  <Activity className="h-4 w-4" /> Mark as Staying
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-text-1">Reason for staying</div>
                  <Select value={activityValue} onValueChange={setActivityValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ClanGames">Clan Games</SelectItem>
                      <SelectItem value="CWL">CWL Participation</SelectItem>
                      <SelectItem value="RaidWeekend">Raid Weekend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => { setActivityOpen(false); setActivityValue(''); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={!activityValue || markStayingByActivity.isPending}
                      onClick={() =>
                        markStayingByActivity.mutate({
                          playerTag: player.playerTag,
                          activity: activityValue as 'ClanGames' | 'CWL' | 'RaidWeekend' | 'Other',
                        })
                      }
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          {player.postedChallenge ? (
            <Button
              variant="outline"
              className="sm:w-auto"
              disabled={setChallenge.isPending}
              onClick={() => setChallenge.mutate({ playerTag: player.playerTag, posted: false })}
            >
              <ShieldAlert className="h-4 w-4" /> Remove Challenge
            </Button>
          ) : (
            <Button
              variant="outline"
              className="sm:w-auto border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
              disabled={setChallenge.isPending}
              onClick={() => setChallenge.mutate({ playerTag: player.playerTag, posted: true })}
            >
              <ShieldCheck className="h-4 w-4" /> Mark Challenge Posted
            </Button>
          )}
          <Button
            onClick={submit}
            className="sm:w-auto"
            disabled={isFailedChallenge && duration == null}
          >
            <AlertTriangle className="h-4 w-4" /> Issue Warning
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// --------------------------------------------------------------------------
// Local helpers
// --------------------------------------------------------------------------

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-3">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
  );
}

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
