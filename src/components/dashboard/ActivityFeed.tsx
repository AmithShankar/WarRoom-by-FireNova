import { memo } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  AlertTriangle, ArrowUpRight, LogIn, LogOut, ShieldCheck, Star, Swords,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import type { ClanActivity } from '@/lib/types';

export function parseActivitySummary(summary: string) {
  const match = summary.match(/^(.*?)(?:\s+(?:by|\(reclassified by|\(by)\s+([^)]+)\)?)$/);
  if (match) {
    return { text: match[1], editor: match[2].replace(/\)$/, '') };
  }
  return { text: summary, editor: null };
}

const iconFor: Record<ClanActivity['type'], React.ElementType> = {
  join: LogIn,
  warning: AlertTriangle,
  kick: LogOut,
  promotion: ArrowUpRight,
  cwl: Star,
  war: Swords,
};

const toneFor: Record<ClanActivity['type'], string> = {
  join: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10',
  warning: 'text-amber-500 dark:text-amber-400 bg-amber-500/10',
  kick: 'text-red-500 bg-red-500/10',
  promotion: 'text-sky-500 dark:text-sky-400 bg-sky-500/10',
  cwl: 'text-brand-from bg-brand-from/10',
  war: 'text-brand-to bg-brand-to/10',
};

export const Row = memo(function Row({
  entry,
  showEditor = true,
}: {
  entry: ClanActivity;
  showEditor?: boolean;
}) {
  const Icon = iconFor[entry.type] || Swords;
  const tone = toneFor[entry.type] || 'text-brand-from bg-brand-from/10';
  const date = new Date(entry.date);
  const { text, editor } = parseActivitySummary(entry.summary);

  return (
    <li className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2 md:px-5">
      <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-text-2">
            <span>{text}</span>
            {editor && showEditor && (
              <span
                className="ml-2 inline-flex items-center gap-1 rounded border border-brand-from/30 bg-brand-from/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-from"
                title={`Action by ${editor}`}
              >
                <ShieldCheck className="h-3 w-3" />
                {editor}
              </span>
            )}
          </p>
          <span className="shrink-0 font-mono text-[10px] text-text-3" title={format(date, 'PPpp')} suppressHydrationWarning>
            {formatDistanceToNowStrict(date, { addSuffix: true })}
          </span>
        </div>
      </div>
    </li>
  );
});

export function ActivityFeed({ activity }: { activity: ClanActivity[] }) {
  const me = trpc.auth.me.useQuery();
  const isLeader = !!me.data?.editor;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Recent Activity</CardTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/activity?tab=audit"
              className="inline-flex items-center cursor-pointer rounded-md border border-brand-from/30 bg-brand-from/10 px-2 py-1 text-[11px] font-medium text-brand-from transition-colors hover:border-brand-from hover:bg-brand-from/20"
            >
              Audit Log
            </Link>
            <Link
              href="/activity"
              className="inline-flex items-center cursor-pointer rounded-md border border-border-1 bg-surface-1 px-2 py-1 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text-1"
            >
              View all
            </Link>
          </div>
        </div>
        <CardDescription>Joins, warnings, promotions, war results.</CardDescription>
      </CardHeader>
      <ul className="divide-y divide-border-1 border-t border-border-1">
        {activity.map(a => <Row key={a.id} entry={a} showEditor={isLeader} />)}
        {activity.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-text-3">No recent activity.</li>
        )}
      </ul>
    </Card>
  );
}
