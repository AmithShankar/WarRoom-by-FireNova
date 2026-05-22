'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import type { ClanActivity, CurrentWar, DashboardOverview, LastWar } from '@/lib/types';
import { mapClanActivity, mapCurrentWar, mapLastWar } from './mappers';

export function useDashboardData() {
  const overview = trpc.dashboard.overview.useQuery();
  const currentWar = trpc.dashboard.currentWar.useQuery();
  const activity = trpc.dashboard.activity.useQuery();
  const lastWar = trpc.dashboard.lastWar.useQuery(undefined, {
    enabled: currentWar.data === null,
  });

  const currentWarMapped = useMemo<CurrentWar | undefined>(
    () => (currentWar.data ? mapCurrentWar(currentWar.data) : undefined),
    [currentWar.data],
  );
  const lastWarMapped = useMemo<LastWar | undefined>(
    () => (lastWar.data ? mapLastWar(lastWar.data) : undefined),
    [lastWar.data],
  );
  const activityMapped = useMemo<ClanActivity[]>(
    () => (activity.data ?? []).map(mapClanActivity),
    [activity.data],
  );

  const isError = overview.isError || currentWar.isError || activity.isError;
  const refetch = () => {
    overview.refetch();
    currentWar.refetch();
    activity.refetch();
  };

  return {
    overview: overview.data as DashboardOverview | undefined,
    currentWar: currentWarMapped,
    lastWar: lastWarMapped,
    activity: activityMapped,
    isLoading: overview.isLoading || currentWar.isLoading || activity.isLoading,
    isError,
    refetch,
  };
}
