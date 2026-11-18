import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import type { PlayerStatus } from '@/lib/prisma';
import { canEdit } from '@/lib/access';
import type { Context } from '../context';

export function stripEditorAttribution(summary: string): string {
  return summary.replace(/\s+(?:by|\(reclassified by|\(by)\s+[^)]+\)?$/, '');
}

async function isAuthorizedLeader(ctx: Context): Promise<boolean> {
  if (!ctx.sessionTag) return false;
  const player = await ctx.prisma.player.findUnique({
    where: { playerTag: ctx.sessionTag },
    select: { role: true, status: true },
  });
  return canEdit(player);
}

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

  lastWar: publicProcedure.query(({ ctx }) =>
    ctx.prisma.warRecord.findFirst({
      orderBy: { endTime: 'desc' },
      include: { participations: { orderBy: { mapPosition: 'asc' } } },
    }),
  ),

  activity: publicProcedure.query(async ({ ctx }) => {
    const isLeader = await isAuthorizedLeader(ctx);
    const rows = await ctx.prisma.clanActivity.findMany({ orderBy: { date: 'desc' }, take: 10 });
    if (isLeader) return rows;
    return rows.map(r => ({ ...r, summary: stripEditorAttribution(r.summary) }));
  }),

  allActivity: publicProcedure.query(async ({ ctx }) => {
    const isLeader = await isAuthorizedLeader(ctx);
    const rows = await ctx.prisma.clanActivity.findMany({ orderBy: { date: 'desc' }, take: 500 });
    if (isLeader) return rows;
    return rows.map(r => ({ ...r, summary: stripEditorAttribution(r.summary) }));
  }),

  playerActivity: publicProcedure
    .input(z.object({ player: z.string() }))
    .query(async ({ ctx, input }) => {
      const isLeader = await isAuthorizedLeader(ctx);
      const rows = await ctx.prisma.clanActivity.findMany({
        where: { player: input.player },
        orderBy: { date: 'desc' },
        take: 15,
      });
      if (isLeader) return rows;
      return rows.map(r => ({ ...r, summary: stripEditorAttribution(r.summary) }));
    }),
});
