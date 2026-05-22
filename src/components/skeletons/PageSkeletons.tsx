import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/** A list/table card skeleton — reused by Warnings, Performance, and Activity. */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="divide-y divide-border-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
            <Skeleton className="h-3.5 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Dashboard skeleton: overview cards, war + activity grid, tactical widgets. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-23" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-105 lg:col-span-2" />
        <Skeleton className="h-105" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}

/** Roster skeleton: tab bar, filter bar, table rows. */
export function RosterSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-9 w-full max-w-xl" />
      <TableSkeleton rows={10} />
    </div>
  );
}

/** CWL planner skeleton: lineup card with 15 slots, plus the two pool panels. */
export function CwlSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="space-y-2 p-4 md:p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-2.5 px-4 pb-4 sm:grid-cols-3 md:grid-cols-5 md:px-5 md:pb-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
