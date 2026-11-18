import { z } from 'zod';
import { router, publicProcedure, viewerProcedure } from '../trpc';
import type { PlayerStatus } from '@/lib/prisma';
import { stripLeaderOnlyFields } from '../leader-only';

export const dashboardRouter = router({
  overview: publicProcedure.query(async ({ ctx }) => {
    const active = { notIn: ['Kicked', 'Left'] as PlayerStatus[] };
    const [totalMembers, activeWarnings, sums, newJoinersPending] = await Promise.all([
      ctx.prisma.player.count({ where: { status: active } }),
      // Only warnings that have not expired yet; no expiry date means it never expires.
      ctx.prisma.warning.count({
        where: { OR: [{ expirationDate: null }, { expirationDate: { gt: new Date() } }] },
      }),
      ctx.prisma.player.aggregate({
        where: { status: active },
        _sum: { cwlStars: true, donations: true, donationsReceived: true },
      }),
      ctx.prisma.player.count({ where: { status: active, postedChallenge: false } }),
    ]);
    return {
      totalMembers,
      activeWarnings,
      cwlStarsThisRound: sums._sum.cwlStars ?? 0,
      donationBalance: (sums._sum.donations ?? 0) - (sums._sum.donationsReceived ?? 0),
      newJoinersPending,
    };
  }),

  currentWar: publicProcedure.query(({ ctx }) =>
    ctx.prisma.war.findFirst({
      where: { isCurrent: true },
      include: { members: { orderBy: { mapPosition: 'asc' } } },
    }),
  ),

  // Participations carry WarParticipation.excuseReason (leader-entered), so this is viewer-aware.
  lastWar: viewerProcedure.query(async ({ ctx }) =>
    stripLeaderOnlyFields(
      await ctx.prisma.warRecord.findFirst({
        orderBy: { endTime: 'desc' },
        include: { participations: { orderBy: { mapPosition: 'asc' } } },
      }),
      ctx.isLeader,
    ),
  ),

  activity: viewerProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.clanActivity.findMany({ orderBy: { date: 'desc' }, take: 10 });
    return stripLeaderOnlyFields(rows, ctx.isLeader);
  }),

  allActivity: viewerProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.clanActivity.findMany({ orderBy: { date: 'desc' }, take: 500 });
    return stripLeaderOnlyFields(rows, ctx.isLeader);
  }),

  playerActivity: viewerProcedure
    .input(z.object({ player: z.string().max(100) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.prisma.clanActivity.findMany({
        where: { player: input.player },
        orderBy: { date: 'desc' },
        take: 15,
      });
      return stripLeaderOnlyFields(rows, ctx.isLeader);
    }),
});
