'use client';

import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { CurrentWarPanel } from '@/components/dashboard/CurrentWarPanel';
import { LastWarPanel } from '@/components/dashboard/LastWarPanel';
import { TacticalStatusWidgets } from '@/components/dashboard/TacticalStatusWidgets';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useRosterData } from '@/hooks/useRosterData';
import { DashboardSkeleton } from '@/components/skeletons/PageSkeletons';
import { QueryError } from '@/components/ui/QueryError';

export default function DashboardPage() {
  const { overview, currentWar, lastWar, activity, isLoading, isError, refetch } = useDashboardData();
  const { data: players } = useRosterData();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-1 md:text-2xl">Command Center</h2>
          <p className="text-sm text-text-2">Live operational read-out of the FireNova clan.</p>
        </div>
      </header>

      {isError ? (
        <QueryError
          message="Couldn't load dashboard data. Check your connection and try again."
          onRetry={refetch}
        />
      ) : isLoading || !overview ? (
        <DashboardSkeleton />
      ) : (
        <>
          <OverviewCards overview={overview} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {currentWar ? (
                <CurrentWarPanel war={currentWar} />
              ) : lastWar ? (
                <LastWarPanel war={lastWar} />
              ) : (
                <p className="text-sm text-text-3">No war data.</p>
              )}
            </div>
            <ActivityFeed activity={activity} />
          </div>

          <TacticalStatusWidgets players={players} />
        </>
      )}
    </div>
  );
}
