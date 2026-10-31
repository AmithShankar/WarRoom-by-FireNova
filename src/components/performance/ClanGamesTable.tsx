'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { TableSkeleton } from '@/components/skeletons/PageSkeletons';
import { QueryError } from '@/components/ui/QueryError';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const label = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

export function ClanGamesTable() {
  const months = trpc.events.clanGamesMonths.useQuery();
  const [picked, setPicked] = useState<string | null>(null);
  const newest = months.data?.[0];
  const selected = picked ?? (newest ? `${newest.year}-${newest.month}` : null);
  const [year, month] = (selected ?? '0-0').split('-').map(Number);
  const games = trpc.events.clanGames.useQuery({ year, month }, { enabled: selected !== null });

  if (months.isError || games.isError) {
    return (
      <QueryError
        message="Couldn't load clan games data. Check your connection and try again."
        onRetry={() => (months.isError ? months.refetch() : games.refetch())}
      />
    );
  }
  if (months.isLoading) return <TableSkeleton rows={8} />;
  if (!months.data || months.data.length === 0 || selected === null) {
    return (
      <Card className="p-10 text-center text-sm text-text-3">
        No clan games data yet. Points fill in once snapshots are taken around the next clan games.
      </Card>
    );
  }

  const rows = games.data ?? [];

  return (
    <div className="space-y-3">
      <Select value={selected} onValueChange={setPicked}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.data.map(m => (
            <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
              {label(m.year, m.month)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {games.isLoading ? (
        <TableSkeleton rows={8} />
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-text-3">
          No current members to show for this month.
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
                  <th className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-text-3">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const dim = !p.points;
                  return (
                    <tr key={p.playerTag} className="border-b border-border-1/60">
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col leading-tight">
                          <span className={cn('text-sm font-medium', dim ? 'text-text-3' : 'text-text-1')}>
                            {p.name}
                          </span>
                          <span className="font-mono text-[10px] text-text-3">{p.playerTag}</span>
                        </div>
                      </td>
                      <td className={cn('px-3 py-2.5 text-right font-mono', dim ? 'text-text-3' : 'text-text-1')}>
                        {p.points === null ? '-' : p.points.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
