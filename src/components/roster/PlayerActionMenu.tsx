'use client';

import { memo, useCallback } from 'react';
import { AlertTriangle, Check, Eye, MoreHorizontal, UserMinus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { Player } from '@/lib/types';

export interface PlayerActionMenuProps {
  player: Player;
  onView: (p: Player) => void;
  onWarnDirect: (p: Player) => void;
  onKick: (p: Player) => void;
  onSetChallenge: (p: Player) => void;
}

export const PlayerActionMenu = memo(function PlayerActionMenu({
  player, onView, onWarnDirect, onKick, onSetChallenge,
}: PlayerActionMenuProps) {
  const handleView = useCallback(() => onView(player), [onView, player]);
  const handleWarnDirect = useCallback(() => onWarnDirect(player), [onWarnDirect, player]);
  const handleKick = useCallback(() => onKick(player), [onKick, player]);
  const handleSetChallenge = useCallback(() => onSetChallenge(player), [onSetChallenge, player]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${player.name}`}
          onClick={e => e.stopPropagation()}
          className="h-8 w-8"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuLabel>{player.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleView}>
          <Eye /> View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWarnDirect}>
          <AlertTriangle /> Issue warning
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSetChallenge}>
          <Check /> {player.postedChallenge ? 'Mark challenge not posted' : 'Mark challenge posted'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onClick={handleKick}>
          <UserMinus /> Kick from clan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
