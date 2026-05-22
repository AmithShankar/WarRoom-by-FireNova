import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import type { PlayerStatus } from '@/lib/types';

const map: Record<PlayerStatus, 'success' | 'warning' | 'muted' | 'danger' | 'info'> = {
  New:     'info',
  Staying: 'success',
  Warned:  'warning',
  Left:    'muted',
  Kicked:  'danger',
};

export const StatusBadge = memo(function StatusBadge({ status }: { status: PlayerStatus }) {
  return <Badge tone={map[status]}>{status}</Badge>;
});
