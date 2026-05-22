import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const dashboardRouter = router({
  overview: publicProcedure.query(async ({ ctx }) => {
    const players = await ctx.prisma.player.findMany();
    const active = players.filter(p => p.status !== 'Kicked' && p.status !== 'Left');
    const warnings = await ctx.prisma.warning.count();
    return {
      totalMembers: active.length,
      activeWarnings: warnings,
      cwlStarsThisRound: active.reduce((s, p) => s + p.cwlStars, 0),
      donationBalance: active.reduce((s, p) => s + p.donations - p.donationsReceived, 0),
      newJoinersPending: active.filter(p => !p.postedChallenge).length,
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
