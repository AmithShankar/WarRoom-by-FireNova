import { memo } from 'react';
import { Crown, Gem, Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';

const ROLE_META: Record<Role, { icon: React.ElementType; className: string; label: string }> = {
  Leader:      { icon: Crown,  className: 'text-amber-500 bg-amber-500/10 border-amber-500/30',         label: 'Leader' },
  'Co-Leader': { icon: Gem,    className: 'text-brand-from bg-brand-from/10 border-brand-from/30',      label: 'Co-Leader' },
  Elder:       { icon: Shield, className: 'text-sky-500 bg-sky-500/10 border-sky-500/30',               label: 'Elder' },
  Member:      { icon: User,   className: 'text-text-2 bg-surface-2 border-border-1',                   label: 'Member' },
};

export const RoleBadge = memo(function RoleBadge({
  role,
  compact,
  className,
}: { role: Role; compact?: boolean; className?: string }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
        meta.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {!compact && meta.label}
    </span>
  );
});
