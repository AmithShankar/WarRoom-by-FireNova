import { memo } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  AlertTriangle, ArrowUpRight, LogIn, LogOut, Star, Swords,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ClanActivity } from '@/lib/types';

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

export const Row = memo(function Row({ entry }: { entry: ClanActivity }) {
  const Icon = iconFor[entry.type];
  const tone = toneFor[entry.type];
  const date = new Date(entry.date);
  return (
    <li className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2 md:px-5">
      <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-text-2">{entry.summary}</p>
          <span className="shrink-0 font-mono text-[10px] text-text-3" title={format(date, 'PPpp')} suppressHydrationWarning>
            {formatDistanceToNowStrict(date, { addSuffix: true })}
          </span>
        </div>
      </div>
    </li>
  );
});

export function ActivityFeed({ activity }: { activity: ClanActivity[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Joins, warnings, promotions, war results.</CardDescription>
          </div>
          <Link
            href="/activity"
            className="shrink-0 cursor-pointer rounded-md border border-border-1 bg-surface-1 px-2.5 py-1 text-[11px] font-medium text-text-2 transition-colors hover:border-border-strong hover:text-text-1"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <ul className="divide-y divide-border-1 border-t border-border-1">
        {activity.map(a => <Row key={a.id} entry={a} />)}
        {activity.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-text-3">No recent activity.</li>
        )}
      </ul>
    </Card>
  );
}
