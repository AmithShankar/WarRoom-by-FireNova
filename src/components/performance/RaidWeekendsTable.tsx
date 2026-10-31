'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { TableSkeleton } from '@/components/skeletons/PageSkeletons';
import { QueryError } from '@/components/ui/QueryError';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fmt = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function RaidWeekendsTable() {
  const seasons = trpc.events.raidSeasons.useQuery();
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? seasons.data?.[0]?.seasonStart.toISOString() ?? null;
  const raid = trpc.events.raid.useQuery(
    { seasonStart: new Date(selected ?? 0) },
    { enabled: selected !== null },
  );

  if (seasons.isError || raid.isError) {
    return (
      <QueryError
        message="Couldn't load raid weekend data. Check your connection and try again."
        onRetry={() => (seasons.isError ? seasons.refetch() : raid.refetch())}
      />
    );
  }
  if (seasons.isLoading) return <TableSkeleton rows={8} />;
  if (!seasons.data || seasons.data.length === 0 || selected === null) {
    return (
      <Card className="p-10 text-center text-sm text-text-3">
        No raid weekend data yet. It fills in as raid weekends finish and sync runs.
      </Card>
    );
  }

  const rows = raid.data ?? [];

  return (
    <div className="space-y-3">
      <Select value={selected} onValueChange={setPicked}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {seasons.data.map(s => (
            <SelectItem key={s.seasonStart.toISOString()} value={s.seasonStart.toISOString()}>
              {fmt(s.seasonStart)} to {fmt(s.seasonEnd)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {raid.isLoading ? (
        <TableSkeleton rows={8} />
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-text-3">
          No current members took part in this raid weekend.
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
                    Attacks
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-wider text-text-3">
                    Capital Gold
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const dim = p.missed || p.looted === 0;
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
                      <td className={cn('px-3 py-2.5 text-right font-mono', dim ? 'text-text-3' : 'text-text-2')}>
                        {p.attacks}/{p.attackLimit}
                      </td>
                      <td className={cn('px-3 py-2.5 text-right font-mono', dim ? 'text-text-3' : 'text-text-1')}>
                        {p.looted.toLocaleString()}
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
