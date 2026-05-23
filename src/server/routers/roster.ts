import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { addHours } from 'date-fns';
import { router, publicProcedure } from '../trpc';
import type { PlayerStatus } from '@/lib/prisma';

const warningInput = z.object({
  playerTag: z.string(),
  date: z.date(),
  durationHours: z.number().int().positive().nullable(),
  reason: z.enum([
    'FailedInitialChallenge', 'MissedWarAttack', 'LowDonations', 'Behavior', 'Other',
  ]),
  notes: z.string(),
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

export const rosterRouter = router({
  list: publicProcedure.query(({ ctx }) =>
    ctx.prisma.player.findMany({
      include: { warnings: { orderBy: { date: 'desc' } }, activity: { orderBy: { date: 'desc' } } },
      orderBy: { name: 'asc' },
    }),
  ),

  issueWarning: publicProcedure.input(warningInput).mutation(async ({ ctx, input }) => {
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
    await ctx.prisma.clanActivity.create({
      data: {
        date: new Date(),
        type: 'warning',
        player: player.name,
        summary: `${player.name} warned for ${REASON_DISPLAY[input.reason]}`,
      },
    });
    if (player.status === 'Staying' || player.status === 'New') {
      await ctx.prisma.player.update({ where: { id: player.id }, data: { status: 'Warned' } });
    }
    return { ok: true };
  }),

  kickPlayer: publicProcedure
    .input(z.object({ playerTag: z.string(), reason: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.prisma.player.findUniqueOrThrow({ where: { playerTag: input.playerTag } });
      await ctx.prisma.player.update({
        where: { id: player.id },
        data: {
          status: 'Kicked',
          kickReason: input.reason,
          removedAt: new Date(),
          activity: { create: { date: new Date(), type: 'kick', summary: `Removed from clan: ${input.reason}` } },
        },
      });
      await ctx.prisma.clanActivity.create({
        data: {
          date: new Date(),
          type: 'kick',
          player: player.name,
          summary: `${player.name} removed from clan: ${input.reason}`,
        },
      });
      return { ok: true };
    }),

  reclassifyDeparture: publicProcedure
    .input(z.object({
      playerTag: z.string(),
      status: z.enum(['Kicked', 'Left']),
      reason: z.string().optional(),
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
      const newSummary =
        input.status === 'Kicked'
          ? `${player.name} was kicked`
          : `${player.name} left the clan`;
      const departure = await ctx.prisma.clanActivity.findFirst({
        where: {
          player: player.name,
          type: 'kick',
          summary: { in: [`${player.name} left the clan`, `${player.name} was kicked`] },
        },
        orderBy: { date: 'desc' },
      });
      if (departure) {
        await ctx.prisma.clanActivity.update({
          where: { id: departure.id },
          data: { summary: newSummary },
        });
      } else if (input.status === 'Kicked') {
        await ctx.prisma.clanActivity.create({
          data: { date: new Date(), type: 'kick', player: player.name, summary: newSummary },
        });
      }
      return { ok: true };
    }),

  setChallenge: publicProcedure
    .input(z.object({ playerTag: z.string(), posted: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.prisma.player.findUniqueOrThrow({
        where: { playerTag: input.playerTag },
        select: { id: true, status: true },
      });
      await ctx.prisma.player.update({
        where: { id: player.id },
        data: {
          postedChallenge: input.posted,
          ...(input.posted && player.status === 'New' ? { status: 'Staying' as const } : {}),
        },
      });
      return { ok: true };
    }),

  markStayingByActivity: publicProcedure
    .input(z.object({
      playerTag: z.string(),
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
      await ctx.prisma.player.update({
        where: { id: player.id },
        data: {
          status: 'Staying',
          activity: {
            create: {
              date: new Date(),
              type: 'promotion',
              summary: `Marked staying — ${label}`,
            },
          },
        },
      });
      return { ok: true };
    }),

  importPlayers: publicProcedure
    .input(z.object({
      players: z.array(z.object({
        playerTag: z.string(),
        name: z.string(),
        townHallLevel: z.number().int(),
        role: z.enum(['Leader', 'CoLeader', 'Elder', 'Member']),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      let imported = 0;
      for (const p of input.players) {
        await ctx.prisma.player.upsert({
          where: { playerTag: p.playerTag },
          update: { name: p.name, townHallLevel: p.townHallLevel, role: p.role },
          create: {
            playerTag: p.playerTag, name: p.name, townHallLevel: p.townHallLevel,
            role: p.role, joinedAt: new Date(),
          },
        });
        imported++;
      }
      return { imported };
    }),
});
