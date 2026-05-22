'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Row } from '@/components/dashboard/ActivityFeed';
import { trpc } from '@/lib/trpc';
import { TableSkeleton } from '@/components/skeletons/PageSkeletons';
import { QueryError } from '@/components/ui/QueryError';
import { mapClanActivity } from '@/hooks/mappers';
import type { ClanActivity } from '@/lib/types';

export default function ActivityPage() {
  const query = trpc.dashboard.allActivity.useQuery();
  const activity = useMemo<ClanActivity[]>(
    () => (query.data ?? []).map(mapClanActivity),
    [query.data],
  );

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-text-1 md:text-2xl">
          All Activity
        </h2>
        <p className="text-sm text-text-2">
          Complete clan activity log: joins, warnings, removals, and war results.
        </p>
      </header>

      {query.isError ? (
        <QueryError message="Couldn't load activity. Check your connection and try again." onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <TableSkeleton rows={10} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border-1">
            {activity.map(a => <Row key={a.id} entry={a} />)}
            {activity.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-text-3">
                No activity recorded.
              </li>
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}
