import { memo } from "react";
import { Crown, ShieldAlert, Sparkles } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/types";

interface ReadinessRowProps {
  label: string;
  ready: number;
  total: number;
  tone: "brand" | "amber" | "emerald";
}

const toneClasses: Record<
  ReadinessRowProps["tone"],
  { bar: string; text: string }
> = {
  brand: { bar: "from-brand-from to-brand-to", text: "text-brand-from" },
  amber: { bar: "from-amber-500 to-orange-500", text: "text-amber-500" },
  emerald: { bar: "from-emerald-500 to-teal-500", text: "text-emerald-500" },
};

const ReadinessRow = memo(function ReadinessRow({
  label,
  ready,
  total,
  tone,
}: ReadinessRowProps) {
  const pct = total === 0 ? 0 : Math.round((ready / total) * 100);
  const c = toneClasses[tone];
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-text-2">{label}</span>
        <span className={cn("font-mono", c.text)}>
          {ready}/{total} <span className="text-text-3">· {pct}%</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full bg-linear-to-r", c.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});

export function TacticalStatusWidgets({ players }: { players: Player[] }) {
  const active = players.filter(
    (p) => p.status === "Staying" || p.status === "Warned",
  );
  const challengePosted = active.filter((p) => p.postedChallenge).length;
  const noWarnings = active.filter((p) => p.warnings.length === 0).length;

  // Leaderboards consider only active members - departed players are excluded.
  const topDonators = [...active]
    .sort((a, b) => b.donations - a.donations)
    .slice(0, 3);
  const recentRecruits = [...active]
    .sort((a, b) => +new Date(b.joinedAt) - +new Date(a.joinedAt))
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-brand-from" /> Roster Readiness
          </CardTitle>
          <CardDescription>
            Tactical state of the active roster.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4 px-4 pb-4 md:px-5 md:pb-5">
          <ReadinessRow
            label="Challenge posted"
            ready={challengePosted}
            total={active.length}
            tone="brand"
          />
          <ReadinessRow
            label="No active warning"
            ready={noWarnings}
            total={active.length}
            tone="amber"
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-400" /> Top Donators
          </CardTitle>
          <CardDescription>Season leaderboard (donated).</CardDescription>
        </CardHeader>
        <ol className="divide-y divide-border-1 border-t border-border-1">
          {topDonators.map((p, i) => (
            <li
              key={p.playerTag}
              className="flex items-center gap-3 px-4 py-2.5 md:px-5"
            >
              <span className="grid h-7 w-7 place-items-center rounded-md bg-surface-2 font-mono text-xs text-text-2">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-1">
                  {p.name}
                </div>
                <div className="font-mono text-[10px] text-text-3">
                  TH{p.townHallLevel} · {p.role}
                </div>
              </div>
              <div className="font-mono text-sm text-text-1">
                {p.donations.toLocaleString()}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-400" /> Recent Recruits
          </CardTitle>
          <CardDescription>Joined in the last 30 days.</CardDescription>
        </CardHeader>
        <ol className="divide-y divide-border-1 border-t border-border-1">
          {recentRecruits.map((p) => {
            const pending = !p.postedChallenge;
            return (
              <li
                key={p.playerTag}
                className="flex items-center gap-3 px-4 py-2.5 md:px-5"
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    pending ? "bg-amber-400" : "bg-emerald-400",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text-1">
                    {p.name}
                  </div>
                  <div className="font-mono text-[10px] text-text-3">
                    TH{p.townHallLevel} ·{" "}
                    {pending ? "Challenge pending" : "Challenge cleared"}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-text-3">
                  {p.playerTag}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
