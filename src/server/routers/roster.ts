import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { addHours } from 'date-fns';
import { router, viewerProcedure, leaderProcedure } from '../trpc';
import { stripLeaderOnlyFields } from '../leader-only';
import type { PlayerStatus } from '@/lib/prisma';

// Length limits on leader-entered input (L5).
const TAG = z.string().max(20);
const FREE_TEXT_MAX = 500;
// Player tags as typed or imported: '#' then 3-12 letters/digits (normalised to upper case client side).
const IMPORT_TAG = z.string().regex(/^#[A-Z0-9]{3,12}$/);
const IMPORT_MAX_PLAYERS = 200;

/** Imports never grant edit rights: elevated roles become Member. Sync owns real roles. */
export function importedRole(role: 'Leader' | 'CoLeader' | 'Elder' | 'Member'): 'Elder' | 'Member' {
  return role === 'Elder' ? 'Elder' : 'Member';
}

const warningInput = z.object({
  playerTag: TAG,
  date: z.date(),
  durationHours: z.number().int().positive().nullable(),
  reason: z.enum([
    'FailedInitialChallenge', 'MissedWarAttack', 'LowDonations', 'Behavior', 'Other',
  ]),
  notes: z.string().max(FREE_TEXT_MAX),
  context: z.object({
    warPerfected: z.boolean(),
    mirrorCleared: z.boolean(),
    thLevelCleared: z.boolean(),
  }).optional(),
}).refine(
  v => v.reason !== 'FailedInitialChallenge' || v.durationHours != null,
  { message: 'Duration is required for Failed Initial Challenge', path: ['durationHours'] },
);

const REASON_DISPLAY: Record<
  'FailedInitialChallenge' | 'MissedWarAttack' | 'LowDonations' | 'Behavior' | 'Other',
  string
> = {
  FailedInitialChallenge: 'Failed Initial Challenge',
  MissedWarAttack: 'Missed War Attack',
  LowDonations: 'Low Donations',
  Behavior: 'Behavior',
  Other: 'Other',
};

export const ACTIVITY_LABELS: Record<'ClanGames' | 'CWL' | 'RaidWeekend' | 'Other', string> = {
  ClanGames: 'Clan Games',
  CWL: 'CWL Participation',
  RaidWeekend: 'Raid Weekend',
  Other: 'Other',
};

/** Returns true when a player is eligible for activity-based promotion to Staying. */
export function canMarkStayingByActivity(status: PlayerStatus): boolean {
  return status === 'New' || status === 'Warned';
}

/** Status once a warning is removed: a Warned player with none left goes back to New or Staying. */
export function statusAfterWarningRemoved(
  status: PlayerStatus,
  remainingWarnings: number,
  postedChallenge: boolean,
): PlayerStatus {
  if (status !== 'Warned' || remainingWarnings > 0) return status;
  return postedChallenge ? 'Staying' : 'New';
}

export const rosterRouter = router({
  list: viewerProcedure.query(async ({ ctx }) => {
    const players = await ctx.prisma.player.findMany({
      include: { warnings: { orderBy: { date: 'desc' } }, activity: { orderBy: { date: 'desc' } } },
      orderBy: { name: 'asc' },
    });
    // Visitors get no leader attribution (M3) and no leader-entered notes or reasons (M4).
    return stripLeaderOnlyFields(players, ctx.isLeader);
  }),

  issueWarning: leaderProcedure.input(warningInput).mutation(async ({ ctx, input }) => {
    const player = await ctx.prisma.player.findUniqueOrThrow({ where: { playerTag: input.playerTag } });
    await ctx.prisma.warning.create({
      data: {
        playerId: player.id,
        date: input.date,
        durationHours: input.durationHours,
        expirationDate: input.durationHours != null
          ? addHours(input.date, input.durationHours)
          : null,
        reason: input.reason,
        notes: input.notes,
        warPerfected: input.context?.warPerfected ?? null,
        mirrorCleared: input.context?.mirrorCleared ?? null,
        thLevelCleared: input.context?.thLevelCleared ?? null,
      },
    });
    const editorName = ctx.editor?.name ?? null;
    await ctx.prisma.clanActivity.create({
      data: {
        date: new Date(),
        type: 'warning',
        player: player.name,
        summary: `${player.name} warned for ${REASON_DISPLAY[input.reason]}`,
        editorName,
      },
    });
    if (player.status === 'Staying' || player.status === 'New') {
      await ctx.prisma.player.update({ where: { id: player.id }, data: { status: 'Warned' } });
    }
    return { ok: true };
  }),

  removeWarning: leaderProcedure
    .input(z.object({ warningId: z.string().max(40) }))
    .mutation(async ({ ctx, input }) => {
      const warning = await ctx.prisma.warning.findUniqueOrThrow({
        where: { id: input.warningId },
        include: { player: true },
      });
      const { player } = warning;
      await ctx.prisma.warning.delete({ where: { id: warning.id } });
      const editorName = ctx.editor?.name ?? null;
      await ctx.prisma.clanActivity.create({
        data: {
          date: new Date(),
          type: 'warning',
          player: player.name,
          summary: `${player.name} warning for ${REASON_DISPLAY[warning.reason]} removed`,
          editorName,
        },
      });
      const remaining = await ctx.prisma.warning.count({ where: { playerId: player.id } });
      const status = statusAfterWarningRemoved(player.status, remaining, player.postedChallenge);
      if (status !== player.status) {
        await ctx.prisma.player.update({ where: { id: player.id }, data: { status } });
      }
      return { ok: true };
    }),

  kickPlayer: leaderProcedure
    .input(z.object({ playerTag: TAG, reason: z.string().min(1).max(FREE_TEXT_MAX) }))
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.prisma.player.findUniqueOrThrow({ where: { playerTag: input.playerTag } });
      const editorName = ctx.editor?.name ?? null;
      await ctx.prisma.player.update({
        where: { id: player.id },
        data: {
          status: 'Kicked',
          kickReason: input.reason,
          removedAt: new Date(),
          activity: {
            create: { date: new Date(), type: 'kick', summary: 'Removed from clan', detail: input.reason, editorName },
          },
        },
      });
      await ctx.prisma.clanActivity.create({
        data: {
          date: new Date(),
          type: 'kick',
          player: player.name,
          summary: `${player.name} removed from clan`,
          detail: input.reason,
          editorName,
        },
      });
      return { ok: true };
    }),

  reclassifyDeparture: leaderProcedure
    .input(z.object({
      playerTag: TAG,
      status: z.enum(['Kicked', 'Left']),
      reason: z.string().max(FREE_TEXT_MAX).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.prisma.player.findUniqueOrThrow({
        where: { playerTag: input.playerTag },
      });
      await ctx.prisma.player.update({
        where: { id: player.id },
        data: {
          status: input.status,
          kickReason: input.status === 'Kicked' ? (input.reason ?? null) : null,
        },
      });

      // Update the existing departure activity in place rather than adding a
      // duplicate row. Sync writes "<name> left the clan"; a prior reclassify
      // may have left "<name> was kicked".
      const editorName = ctx.editor?.name ?? null;
      const newSummary = input.status === 'Kicked' ? `${player.name} was kicked` : `${player.name} left the clan`;
      const detail = input.status === 'Kicked' ? (input.reason || null) : null;
      const departure = await ctx.prisma.clanActivity.findFirst({
        where: {
          player: player.name,
          type: 'kick',
          summary: { contains: player.name },
        },
        orderBy: { date: 'desc' },
      });
      if (departure) {
        await ctx.prisma.clanActivity.update({
          where: { id: departure.id },
          data: { summary: newSummary, detail, editorName },
        });
      } else if (input.status === 'Kicked') {
        await ctx.prisma.clanActivity.create({
          data: { date: new Date(), type: 'kick', player: player.name, summary: newSummary, detail, editorName },
        });
      }
      return { ok: true };
    }),

  setChallenge: leaderProcedure
    .input(z.object({ playerTag: TAG, posted: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.prisma.player.findUniqueOrThrow({
        where: { playerTag: input.playerTag },
        select: { id: true, name: true, status: true },
      });
      await ctx.prisma.player.update({
        where: { id: player.id },
        data: {
          postedChallenge: input.posted,
          ...(input.posted && player.status === 'New' ? { status: 'Staying' as const } : {}),
        },
      });
      const editorName = ctx.editor?.name ?? null;
      await ctx.prisma.clanActivity.create({
        data: {
          date: new Date(),
          type: 'promotion',
          player: player.name,
          summary: `${player.name} challenge ${input.posted ? 'marked posted' : 'unmarked'}`,
          editorName,
        },
      });
      return { ok: true };
    }),

  markStayingByActivity: leaderProcedure
    .input(z.object({
      playerTag: TAG,
      activity: z.enum(['ClanGames', 'CWL', 'RaidWeekend', 'Other']),
    }))
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.prisma.player.findUniqueOrThrow({
        where: { playerTag: input.playerTag },
        select: { id: true, name: true, status: true },
      });
      if (!canMarkStayingByActivity(player.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Player status "${player.status}" is not eligible for activity-based promotion.`,
        });
      }
      const label = ACTIVITY_LABELS[input.activity];
      const editorName = ctx.editor?.name ?? null;
      await ctx.prisma.player.update({
        where: { id: player.id },
        data: {
          status: 'Staying',
          activity: {
            create: {
              date: new Date(),
              type: 'promotion',
              summary: `Marked staying — ${label}`,
              editorName,
            },
          },
        },
      });
      await ctx.prisma.clanActivity.create({
        data: {
          date: new Date(),
          type: 'promotion',
          player: player.name,
          summary: `${player.name} marked staying (${label})`,
          editorName,
        },
      });
      return { ok: true };
    }),

  importPlayers: leaderProcedure
    .input(z.object({
      players: z.array(z.object({
        playerTag: IMPORT_TAG,
        name: z.string().min(1).max(50),
        townHallLevel: z.number().int().min(1).max(30),
        role: z.enum(['Leader', 'CoLeader', 'Elder', 'Member']),
      })).max(IMPORT_MAX_PLAYERS),
    }))
    .mutation(async ({ ctx, input }) => {
      let imported = 0;
      for (const p of input.players) {
        await ctx.prisma.player.upsert({
          where: { playerTag: p.playerTag },
          // Never touch an existing player's role, and never create a Leader or Co-Leader:
          // edit rights come only from roles synced from Clash of Clans (L5).
          update: { name: p.name, townHallLevel: p.townHallLevel },
          create: {
            playerTag: p.playerTag, name: p.name, townHallLevel: p.townHallLevel,
            role: importedRole(p.role), joinedAt: new Date(),
          },
        });
        imported++;
      }
      return { imported };
    }),
});
