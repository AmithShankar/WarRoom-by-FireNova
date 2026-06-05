import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const dashboardRouter = router({
  overview: publicProcedure.query(async ({ ctx }) => {
    const active = { notIn: ['Kicked', 'Left'] } as const;
    const [totalMembers, activeWarnings, sums, newJoinersPending] = await Promise.all([
      ctx.prisma.player.count({ where: { status: active } }),
      ctx.prisma.warning.count(),
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

  lastWar: publicProcedure.query(({ ctx }) =>
    ctx.prisma.warRecord.findFirst({
      orderBy: { endTime: 'desc' },
      include: { participations: { orderBy: { mapPosition: 'asc' } } },
    }),
  ),

  activity: publicProcedure.query(({ ctx }) =>
    ctx.prisma.clanActivity.findMany({ orderBy: { date: 'desc' }, take: 10 }),
  ),

  allActivity: publicProcedure.query(({ ctx }) =>
    ctx.prisma.clanActivity.findMany({ orderBy: { date: 'desc' }, take: 500 }),
  ),

  playerActivity: publicProcedure
    .input(z.object({ player: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.clanActivity.findMany({
        where: { player: input.player },
        orderBy: { date: 'desc' },
        take: 15,
      }),
    ),
});
