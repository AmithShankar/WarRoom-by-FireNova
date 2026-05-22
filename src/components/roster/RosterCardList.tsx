'use client';

import { memo, useMemo, useState } from 'react';
import { Check, Search, ShieldAlert, Star, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { ThBadge } from './ThBadge';
import { RoleBadge } from './RoleBadge';
import { PlayerActionMenu } from './PlayerActionMenu';

export interface RosterCardListProps {
  data: Player[];
  onRowClick: (p: Player) => void;
  onWarnDirect: (p: Player) => void;
  onKick: (p: Player) => void;
  onSetChallenge: (p: Player) => void;
}

const PlayerCard = memo(function PlayerCard({
  player, onClick, onWarnDirect, onKick, onSetChallenge,
}: {
  player: Player;
  onClick: (p: Player) => void;
  onWarnDirect: (p: Player) => void;
  onKick: (p: Player) => void;
  onSetChallenge: (p: Player) => void;
}) {
  const needsAttention = !player.postedChallenge && player.status !== 'Kicked' && player.status !== 'Left';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(player)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(player); } }}
      className={cn(
        'flex w-full flex-col gap-3 rounded-xl border border-border-1 bg-surface-1 p-4 text-left transition-colors cursor-pointer hover:bg-surface-2 active:bg-surface-2',
        needsAttention && 'attention-row',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-text-1">{player.name}</span>
            <ThBadge level={player.townHallLevel} />
          </div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-text-3">
            <span>{player.playerTag}</span>
          </div>
        </div>
        <PlayerActionMenu
          player={player}
          onView={onClick}
          onWarnDirect={onWarnDirect}
          onKick={onKick}
          onSetChallenge={onSetChallenge}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={player.status} />
        <RoleBadge role={player.role} />
        {needsAttention && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-3 w-3" /> Awaiting challenge
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border-1 pt-3 text-center">
        <Stat label="Challenge" value={
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onSetChallenge(player); }}
            aria-label={player.postedChallenge ? 'Mark challenge not posted' : 'Mark challenge posted'}
            className="inline-flex cursor-pointer items-center justify-center rounded-md p-0.5 hover:bg-surface-3"
          >
            {player.postedChallenge
              ? <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              : <X className="h-4 w-4 text-red-500" />}
          </button>
        } />
        <Stat label="CWL ★" value={<span className="font-mono">{player.cwlStats.stars}</span>} icon={Star} />
        <Stat label="Warnings" value={<span className="font-mono">{player.warnings.length}</span>} />
      </div>
    </div>
  );
});

function Stat({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-3">{label}</div>
      <div className="mt-1 inline-flex items-center justify-center gap-1 text-sm font-medium text-text-1">
        {Icon && <Icon className="h-3 w-3 text-brand-from" />}
        {value}
      </div>
    </div>
  );
}

export function RosterCardList({ data, onRowClick, onWarnDirect, onKick, onSetChallenge }: RosterCardListProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.playerTag.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          className="pl-9"
        />
      </div>

      <div className="space-y-2.5">
        {filtered.map(p => (
          <PlayerCard
            key={p.playerTag}
            player={p}
            onClick={onRowClick}
            onWarnDirect={onWarnDirect}
            onKick={onKick}
            onSetChallenge={onSetChallenge}
          />
        ))}
        {filtered.length === 0 && (
          <Card className="px-4 py-8 text-center text-sm text-text-3">
            No players match the current filters.
          </Card>
        )}
      </div>
    </div>
  );
}
