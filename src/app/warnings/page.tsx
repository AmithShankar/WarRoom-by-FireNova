'use client';

import { useMemo } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRosterData } from '@/hooks/useRosterData';
import { useNow } from '@/hooks/useMediaQuery';
import { TableSkeleton } from '@/components/skeletons/PageSkeletons';
import { QueryError } from '@/components/ui/QueryError';
import type { WarningReason } from '@/lib/types';

const reasonTone: Record<WarningReason, 'danger' | 'warning' | 'brand' | 'neutral'> = {
  'Failed Initial Challenge': 'danger',
  'Missed War Attack':        'warning',
  'Low Donations':            'warning',
  Behavior:                   'brand',
  Other:                      'neutral',
};

export default function WarningsPage() {
  const { data, isLoading, isError, refetch } = useRosterData();
  const now = useNow();

  const flat = useMemo(
    () =>
      data
        .flatMap(p => p.warnings.map(w => ({ player: p, w })))
        .sort((a, b) => +new Date(b.w.date) - +new Date(a.w.date)),
    [data],
  );

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-text-1 md:text-2xl">All Warnings</h2>
        <p className="text-sm text-text-2">Chronological audit log of every active and historical warning.</p>
      </header>

      {isError ? (
        <QueryError message="Couldn't load warnings. Check your connection and try again." onRetry={refetch} />
      ) : isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Audit Log
          </CardTitle>
          <CardDescription>{flat.length} total entries.</CardDescription>
        </CardHeader>
        <ul className="divide-y divide-border-1 border-t border-border-1">
          {flat.map(({ player, w }) => {
            const expired = w.expirationDate
              ? new Date(w.expirationDate).getTime() < now
              : false;
            return (
              <li key={w.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-text-1">{player.name}</span>
                    <span className="font-mono text-[10px] text-text-3">{player.playerTag}</span>
                    <Badge tone={reasonTone[w.reason]}>{w.reason}</Badge>
                  </div>
                  {w.notes && <p className="mt-1 text-xs text-text-2">{w.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3 font-mono text-[11px]">
                  <span className="inline-flex items-center gap-1 text-text-3">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNowStrict(new Date(w.date), { addSuffix: true })}
                  </span>
                  {w.expirationDate ? (
                    <span
                      className={cn(
                        expired
                          ? 'text-text-3 line-through'
                          : 'text-amber-500 dark:text-amber-400',
                      )}
                    >
                      exp {format(new Date(w.expirationDate), 'yyyy-MM-dd HH:mm')}
                    </span>
                  ) : (
                    <span className="text-text-3">no expiry</span>
                  )}
                </div>
              </li>
            );
          })}
          {flat.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-text-3">No warnings recorded.</li>
          )}
        </ul>
      </Card>
      )}
    </div>
  );
}
