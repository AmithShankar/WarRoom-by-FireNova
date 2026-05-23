import { CwlSkeleton } from '@/components/skeletons/PageSkeletons';

export default function Loading() {
  return (
    <div className="space-y-5">
      <header>
        <div className="h-7 w-44 animate-pulse rounded bg-surface-3" />
        <div className="mt-1.5 h-4 w-80 animate-pulse rounded bg-surface-3" />
      </header>
      <CwlSkeleton />
    </div>
  );
}
