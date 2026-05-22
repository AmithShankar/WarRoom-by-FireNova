import { memo } from 'react';
import { cn } from '@/lib/utils';

export const ThBadge = memo(function ThBadge({
  level,
  className,
}: { level: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md border border-border-1 bg-surface-2 px-1.5 font-mono text-[11px] font-medium text-text-1',
        className,
      )}
    >
      TH{level}
    </span>
  );
});
