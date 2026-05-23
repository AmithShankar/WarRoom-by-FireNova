import { TableSkeleton } from '@/components/skeletons/PageSkeletons';

export default function Loading() {
  return (
    <div className="space-y-5">
      <header>
        <div className="h-7 w-36 animate-pulse rounded bg-surface-3" />
        <div className="mt-1.5 h-4 w-72 animate-pulse rounded bg-surface-3" />
      </header>
      <TableSkeleton rows={10} />
    </div>
  );
}
