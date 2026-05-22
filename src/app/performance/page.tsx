'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { TableSkeleton } from '@/components/skeletons/PageSkeletons';
import { QueryError } from '@/components/ui/QueryError';
import type { PerformanceScope } from '@/lib/types';

const SCOPES: { value: PerformanceScope; label: string }[] = [
  { value: 'all', label: 'All Wars' },
  { value: 'regular', label: 'Regular' },
  { value: 'cwl', label: 'CWL' },
];

type SortKey = 'totalStars' | 'threeStarRate' | 'avgDestruction' | 'attacksUsed' | 'missedAttacks';

export default function PerformancePage() {
  const [scope, setScope] = useState<PerformanceScope>('all');
  const [sortKey, setSortKey] = useState<SortKey>('totalStars');
  const query = trpc.performance.leaderboard.useQuery({ scope });

  const rows = useMemo(() => {
    const data = query.data ?? [];
    return [...data].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [query.data, sortKey]);

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-text-1 md:text-2xl">
          Performance
        </h2>
        <p className="text-sm text-text-2">
          Per-player war and CWL performance, accumulated as wars complete.
        </p>
      </header>

      <div className="flex gap-2">
        {SCOPES.map(s => (
          <button
            key={s.value}
            type="button"
            onClick={() => setScope(s.value)}
            className={cn(
              'cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors',
              scope === s.value
                ? 'border-brand-from/40 bg-brand-from/10 text-brand-from'
                : 'border-border-1 bg-surface-1 text-text-2 hover:border-border-strong',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {query.isError ? (
        <QueryError message="Couldn't load performance data. Check your connection and try again." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <TableSkeleton rows={8} />
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-text-3">
          No war data yet. Performance fills in as wars complete and sync runs.
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-border-1 bg-surface-1/85">
                <tr>
                  <th className="px-3 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-text-3">
                    Player
                  </th>
                  {([
                    ['Wars', null],
                    ['Attacks', 'attacksUsed'],
                    ['Stars', 'totalStars'],
                    ['3-Star %', 'threeStarRate'],
                    ['Avg Dest.', 'avgDestruction'],
                    ['Missed', 'missedAttacks'],
                  ] as [string, SortKey | null][]).map(([label, key]) => (
                    <th
                      key={label}
                      onClick={key ? () => setSortKey(key) : undefined}
                      className={cn(
                        'px-3 py-3 text-right text-[10px] font-medium uppercase tracking-wider',
                        key ? 'cursor-pointer text-text-3 hover:text-text-1' : 'text-text-3',
                        key && sortKey === key && 'text-brand-from',
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.playerTag} className="border-b border-border-1/60">
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-medium text-text-1">{p.name}</span>
                        <span className="font-mono text-[10px] text-text-3">{p.playerTag}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-2">{p.warsParticipated}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-2">
                      {p.attacksUsed}/{p.attacksAvailable}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-1">{p.totalStars}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-2">
                      {Math.round(p.threeStarRate * 100)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-2">
                      {p.avgDestruction.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-2">
                      {p.missedAttacks}
                      {p.excusedMisses > 0 && (
                        <span className="ml-1 text-[10px] text-text-3">
                          ({p.excusedMisses} excused)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
