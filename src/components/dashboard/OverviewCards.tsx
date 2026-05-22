import { memo } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import type { DashboardOverview } from "@/lib/types";

interface Stat {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: "brand" | "amber" | "emerald" | "sky";
}

const accentMap: Record<NonNullable<Stat["accent"]>, string> = {
  brand: "from-brand-from/15 to-brand-to/10  text-brand-from",
  amber:
    "from-amber-500/15  to-amber-500/5  text-amber-500 dark:text-amber-400",
  emerald:
    "from-emerald-500/15 to-emerald-500/5 text-emerald-500 dark:text-emerald-400",
  sky: "from-sky-500/15    to-sky-500/5    text-sky-500 dark:text-sky-400",
};

const StatCard = memo(function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  return (
    <Card className="relative overflow-hidden p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-3">
            {stat.label}
          </div>
          <div className="font-mono text-xl font-semibold tracking-tight text-text-1 md:text-2xl">
            {stat.value}
          </div>
        </div>
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br",
            accentMap[stat.accent ?? "brand"],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-linear-to-br from-brand-from/10 to-brand-to/0 blur-2xl"
      />
    </Card>
  );
});

export function OverviewCards({ overview }: { overview: DashboardOverview }) {
  // Every value below is derived from real synced data. No fabricated deltas.
  const stats: Stat[] = [
    {
      label: "Active Members",
      value: formatNumber(overview.totalMembers),
      icon: Users,
      accent: "brand",
    },
    {
      label: "Active Warnings",
      value: formatNumber(overview.activeWarnings),
      icon: AlertTriangle,
      accent: "amber",
    },
    {
      label: "CWL Stars · Round",
      value: formatNumber(overview.cwlStarsThisRound),
      icon: Star,
      accent: "sky",
    },
    {
      label: "Donation Balance",
      value: formatNumber(overview.donationBalance),
      icon: ArrowUpRight,
      accent: "brand",
    },
    {
      label: "New Joiners Pending",
      value: formatNumber(overview.newJoinersPending),
      icon: UserPlus,
      accent: "amber",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((s) => (
        <StatCard key={s.label} stat={s} />
      ))}
    </div>
  );
}
