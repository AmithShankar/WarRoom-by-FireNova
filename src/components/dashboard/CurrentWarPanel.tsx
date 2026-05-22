'use client';

import { memo } from 'react';
import { Clock, Swords } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CurrentWar } from '@/lib/types';
import { useNow } from '@/hooks/useMediaQuery';
import { WarSideCard, WarMemberTable } from './war-shared';

const STATE_LABEL: Record<CurrentWar['state'], string> = {
  preparation: 'Preparation',
  battle: 'Battle Day',
  ended: 'War Ended',
};

const STATE_TONE: Record<CurrentWar['state'], 'brand' | 'neutral'> = {
  preparation: 'neutral',
  battle: 'brand',
  ended: 'neutral',
};

const RESULT: Record<NonNullable<CurrentWar['result']>, { label: string; cls: string }> = {
  win:  { label: 'Victory', cls: 'text-emerald-500 dark:text-emerald-400' },
  loss: { label: 'Defeat',  cls: 'text-red-500' },
  draw: { label: 'Draw',    cls: 'text-text-2' },
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Phase ended';
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '<1m';
}

function formatAgo(ms: number): string {
  if (ms < 0) return 'just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ago`;
}

export const CurrentWarPanel = memo(function CurrentWarPanel({ war }: { war: CurrentWar }) {
  const now = useNow();
  const maxStars = war.teamSize * 3;
  const totalAttacks = war.teamSize * war.attacksPerMember;
  const attacksRemaining = Math.max(0, totalAttacks - war.clanAttacksUsed);
  const attackPct = totalAttacks === 0
    ? 0
    : Math.round((war.clanAttacksUsed / totalAttacks) * 100);
  const clanLeading =
    war.clanStars > war.opponentStars ||
    (war.clanStars === war.opponentStars && war.clanDestruction >= war.opponentDestruction);
  const remaining = new Date(war.phaseEndsAt).getTime() - now;

  const starDiff = war.clanStars - war.opponentStars;
  const leadLine =
    starDiff > 0 ? `FireNova leads by ${starDiff}★`
    : starDiff < 0 ? `Behind by ${-starDiff}★`
    : 'Tied on stars';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-brand-from" /> Current War
          </CardTitle>
          <Badge tone={STATE_TONE[war.state]}>{STATE_LABEL[war.state]}</Badge>
        </div>
        <CardDescription>
          vs {war.opponent} · {war.teamSize} v {war.teamSize}
        </CardDescription>
      </CardHeader>

      <div className="space-y-3 px-4 pb-4 md:px-5 md:pb-5">
        <div className="flex items-stretch gap-2">
          <WarSideCard
            name="FireNova"
            stars={war.clanStars}
            maxStars={maxStars}
            destruction={war.clanDestruction}
            leading={clanLeading}
          />
          <div className="flex items-center font-mono text-[10px] uppercase tracking-wider text-text-3">
            vs
          </div>
          <WarSideCard
            name={war.opponent}
            stars={war.opponentStars}
            maxStars={maxStars}
            destruction={war.opponentDestruction}
            leading={!clanLeading}
          />
        </div>

        <div
          className={cn(
            'rounded-lg border px-3 py-1.5 text-center text-xs font-medium',
            starDiff > 0
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : starDiff < 0
              ? 'border-red-500/30 bg-red-500/10 text-red-500'
              : 'border-border-1 bg-surface-2/40 text-text-2',
          )}
        >
          {leadLine}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border-1 bg-surface-2/40 px-3 py-2 text-sm">
          {war.state === 'ended' ? (
            <>
              <span className="text-text-2">Result</span>
              <span className={cn('font-semibold', war.result ? RESULT[war.result].cls : 'text-text-2')}>
                {war.result ? RESULT[war.result].label : '-'}
              </span>
            </>
          ) : (
            <>
              <span className="text-text-2">
                {war.state === 'battle' ? 'Battle ends in' : 'Preparation ends in'}
              </span>
              <span className="font-mono text-text-1" suppressHydrationWarning>
                {formatCountdown(remaining)}
              </span>
            </>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-text-2">Attacks used</span>
            <span className="font-mono text-text-1">
              {war.clanAttacksUsed}/{totalAttacks}
              <span className="ml-2 text-text-3">{attacksRemaining} left</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-from to-brand-to"
              style={{ width: `${attackPct}%` }}
            />
          </div>
        </div>

        <WarMemberTable members={war.members.map(m => ({ ...m }))} />

        <div className="flex items-center gap-1.5 text-[11px] text-text-3">
          <Clock className="h-3 w-3" />
          <span suppressHydrationWarning>
            Synced {formatAgo(now - new Date(war.lastSyncedAt).getTime())}
          </span>
        </div>
      </div>
    </Card>
  );
});
