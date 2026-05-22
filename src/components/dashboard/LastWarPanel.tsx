'use client';

import { Swords } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { LastWar } from '@/lib/types';
import { WarSideCard, WarMemberTable } from './war-shared';

const RESULT: Record<NonNullable<LastWar['result']>, { label: string; cls: string }> = {
  win:  { label: 'Victory', cls: 'text-emerald-500 dark:text-emerald-400' },
  loss: { label: 'Defeat',  cls: 'text-red-500' },
  draw: { label: 'Draw',    cls: 'text-text-2' },
};

export function LastWarPanel({ war }: { war: LastWar }) {
  const maxStars = war.teamSize * 3;
  const totalAttacks = war.teamSize * war.attacksPerMember;
  const attackPct = totalAttacks === 0
    ? 0
    : Math.round((war.clanAttacksUsed / totalAttacks) * 100);
  const clanLeading =
    war.clanStars > war.opponentStars ||
    (war.clanStars === war.opponentStars && war.clanDestruction >= war.opponentDestruction);

  const endedAgo = formatDistanceToNow(new Date(war.endTime), { addSuffix: true });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-brand-from" /> Last War
            {war.isCwl && (
              <span className="ml-1 text-xs font-normal text-text-3">(CWL)</span>
            )}
          </CardTitle>
          <Badge tone="neutral">Ended</Badge>
        </div>
        <CardDescription>
          vs {war.opponent} · {war.teamSize} v {war.teamSize}
        </CardDescription>
      </CardHeader>

      <div className="space-y-3 px-4 pb-4 md:px-5 md:pb-5">
        {/* Scoreboard */}
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

        {/* Result */}
        <div className="flex items-center justify-between rounded-lg border border-border-1 bg-surface-2/40 px-3 py-2 text-sm">
          <span className="text-text-2">Result</span>
          <span className={cn('font-semibold', war.result ? RESULT[war.result].cls : 'text-text-2')}>
            {war.result ? RESULT[war.result].label : '—'}
          </span>
        </div>

        {/* Attacks summary */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-text-2">Attacks used</span>
            <span className="font-mono text-text-1">
              {war.clanAttacksUsed}/{totalAttacks}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-from to-brand-to"
              style={{ width: `${attackPct}%` }}
            />
          </div>
        </div>

        {/* Per-member table */}
        <WarMemberTable
          members={war.members.map(m => ({
            tag: m.playerTag,
            name: m.name,
            mapPosition: m.mapPosition,
            attacksUsed: m.attacksUsed,
            attacksTotal: m.attacksTotal,
            starsEarned: m.starsEarned,
            destruction: m.destruction,
          }))}
        />

        {/* Footer */}
        <div className="text-[11px] text-text-3">
          Ended {endedAgo}
        </div>
      </div>
    </Card>
  );
}
