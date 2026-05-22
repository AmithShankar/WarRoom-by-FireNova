import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors',
  {
    variants: {
      tone: {
        neutral: 'border-border-1 bg-surface-2 text-text-2',
        success: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400',
        warning: 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400',
        danger: 'border-red-500/30 bg-red-500/15 text-red-600 dark:text-red-400',
        muted: 'border-border-1 bg-surface-3 text-text-2',
        brand: 'border-brand-from/30 bg-brand-from/10 text-brand-from',
        info: 'border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
