'use client';

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import type { Player, WarningReason, WarWarningContext } from '@/lib/types';
import type { DuplicateMode, ImportResult, ImportRow } from '@/lib/import-export/types';
import { mapPlayer, toPrismaWarningReason } from './mappers';

export type IssueWarningInput = {
  playerTag: string;
  date: Date;
  durationHours: number | null;
  reason: WarningReason;
  notes: string;
  context?: WarWarningContext;
};

// UI Role display string → Prisma enum name (for importPlayers).
const ROLE_TO_PRISMA: Record<Player['role'], 'Leader' | 'CoLeader' | 'Elder' | 'Member'> = {
  Leader: 'Leader',
  'Co-Leader': 'CoLeader',
  Elder: 'Elder',
  Member: 'Member',
};

/**
 * Roster data hook - tRPC-backed. Keeps the same return surface the UI
 * components expect; Prisma rows are bridged to UI `Player` via `mappers.ts`.
 */
export function useRosterData() {
  const utils = trpc.useUtils();
  const list = trpc.roster.list.useQuery();

  const warn = trpc.roster.issueWarning.useMutation({
    onSuccess: () => {
      utils.roster.list.invalidate();
      utils.dashboard.overview.invalidate();
    },
    onError: () => toast.error("Couldn't issue the warning. Please try again."),
  });
  const kick = trpc.roster.kickPlayer.useMutation({
    onSuccess: () => {
      utils.roster.list.invalidate();
      utils.cwl.board.invalidate();
    },
    onError: () => toast.error("Couldn't remove the player. Please try again."),
  });
  const importMut = trpc.roster.importPlayers.useMutation({
    onSuccess: () => utils.roster.list.invalidate(),
    onError: () => toast.error("Import failed. Your roster hasn't changed."),
  });
  const reclassifyMut = trpc.roster.reclassifyDeparture.useMutation({
    onSuccess: () => {
      utils.roster.list.invalidate();
      utils.dashboard.activity.invalidate();
    },
    onError: () => toast.error("Couldn't update the player's status. Please try again."),
  });
  const challengeMut = trpc.roster.setChallenge.useMutation({
    onSuccess: () => {
      utils.roster.list.invalidate();
      utils.dashboard.overview.invalidate();
      utils.cwl.board.invalidate();
    },
    onError: () => toast.error("Couldn't update the challenge status. Please try again."),
  });

  const data = useMemo<Player[]>(
    () => (list.data ?? []).map(mapPlayer),
    [list.data],
  );

  const issueWarning = useCallback(
    (input: IssueWarningInput) => {
      warn.mutate({
        playerTag: input.playerTag,
        date: input.date,
        durationHours: input.durationHours,
        reason: toPrismaWarningReason(input.reason),
        notes: input.notes,
        context: input.context,
      });
    },
    [warn],
  );

  const kickPlayer = useCallback(
    (tag: string, reason: string) => kick.mutate({ playerTag: tag, reason }),
    [kick],
  );

  const setChallenge = useCallback(
    (tag: string, posted: boolean) => challengeMut.mutate({ playerTag: tag, posted }),
    [challengeMut],
  );

  const reclassifyDeparture = useCallback(
    (playerTag: string, status: 'Kicked' | 'Left', reason?: string) =>
      reclassifyMut.mutate({ playerTag, status, reason }),
    [reclassifyMut],
  );

  // Keeps the existing synchronous `(rows, mode) => ImportResult` contract the
  // UI relies on. Result counters are deterministic from rows+mode; the actual
  // DB write is fired as a side effect for newly-imported (non-duplicate) rows.
  const importPlayers = useCallback(
    (rows: ImportRow[], mode: DuplicateMode): ImportResult => {
      const validRows = rows.filter(r => r.errors.length === 0);
      const errorRows = rows.filter(r => r.errors.length > 0);

      let imported = 0, updated = 0, skipped = 0;
      for (const row of validRows) {
        if (!row.parsed.playerTag) continue;
        if (row.isDuplicate) {
          if (mode === 'skip') skipped++;
          else updated++;
        } else {
          imported++;
        }
      }

      const toWrite = validRows
        .filter(r => r.parsed.playerTag && (!r.isDuplicate || mode !== 'skip'))
        .map(r => {
          const p = r.parsed;
          return {
            playerTag: p.playerTag as string,
            name: p.name ?? '',
            townHallLevel: p.townHallLevel ?? 1,
            role: ROLE_TO_PRISMA[p.role ?? 'Member'],
          };
        });
      if (toWrite.length > 0) importMut.mutate({ players: toWrite });

      return { total: rows.length, imported, updated, skipped, failed: errorRows.length, errorRows };
    },
    [importMut],
  );

  return {
    data,
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: list.refetch,
    issueWarning,
    kickPlayer,
    importPlayers,
    setChallenge,
    reclassifyDeparture,
  };
}
