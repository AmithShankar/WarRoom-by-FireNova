import { DashboardSkeleton } from '@/components/skeletons/PageSkeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="h-7 w-44 animate-pulse rounded bg-surface-3" />
          <div className="mt-1.5 h-4 w-64 animate-pulse rounded bg-surface-3" />
        </div>
      </header>
      <DashboardSkeleton />
    </div>
  );
}
