'use client';

import { memo } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── WarSideCard ──────────────────────────────────────────────────────────────

export const WarSideCard = memo(function WarSideCard({
  name, stars, maxStars, destruction, leading,
}: {
  name: string;
  stars: number;
  maxStars: number;
  destruction: number;
  leading: boolean;
}) {
  const pct = maxStars === 0 ? 0 : Math.round((stars / maxStars) * 100);
  return (
    <div
      className={cn(
        'flex-1 rounded-xl border p-3 text-center transition-colors',
        leading ? 'border-brand-from/30 bg-surface-2/60' : 'border-border-1 bg-surface-2/30',
      )}
    >
      <div className="truncate text-sm font-medium text-text-1">{name}</div>
      <div className="mt-1 inline-flex items-baseline gap-1 font-mono font-semibold text-text-1">
        <Star className="h-5 w-5 self-center text-brand-from" />
        <span className="text-2xl">{stars}</span>
        <span className="text-xs text-text-3">/ {maxStars}</span>
      </div>
      <div className="mx-auto mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-from to-brand-to"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 font-mono text-[11px] text-text-3">
        {destruction.toFixed(1)}% destruction
      </div>
    </div>
  );
});

// ── WarMemberTable ───────────────────────────────────────────────────────────

export type WarMemberRow = {
  tag: string;
  name: string;
  mapPosition: number;
  attacksUsed: number;
  attacksTotal: number;
  starsEarned: number;
  destruction: number;
};

export function WarMemberTable({ members }: { members: WarMemberRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-1">
      <div className="max-h-72 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface-2/90 backdrop-blur">
            <tr className="border-b border-border-1 text-[10px] uppercase tracking-wider text-text-3">
              <th className="px-2 py-2 text-left font-medium">#</th>
              <th className="px-2 py-2 text-left font-medium">Player</th>
              <th className="px-2 py-2 text-right font-medium">Attacks</th>
              <th className="px-2 py-2 text-right font-medium">★</th>
              <th className="px-2 py-2 text-right font-medium">Dest.</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-xs text-text-3">
                  No member data for this war.
                </td>
              </tr>
            )}
            {members.map(m => {
              const owes = m.attacksUsed < m.attacksTotal;
              return (
                <tr
                  key={m.tag}
                  className={cn(
                    'border-b border-border-1/60 last:border-0',
                    owes && 'bg-amber-500/5',
                  )}
                >
                  <td className="px-2 py-1.5 font-mono text-[11px] text-text-3">
                    {m.mapPosition}
                  </td>
                  <td className="px-2 py-1.5 text-text-1">{m.name}</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={cn('font-mono', owes ? 'text-amber-600 dark:text-amber-400' : 'text-text-2')}>
                      {m.attacksUsed}/{m.attacksTotal}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-text-1">
                    {m.starsEarned}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-text-3">
                    {Math.round(m.destruction)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
