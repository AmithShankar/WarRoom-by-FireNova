import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { aggregatePerformance, type ParticipationRow } from '@/lib/performance';
import type { prisma } from '@/lib/prisma';

const scope = z.enum(['all', 'regular', 'cwl']);
type Scope = z.infer<typeof scope>;

async function loadRows(db: typeof prisma, s: Scope): Promise<ParticipationRow[]> {
  const where = s === 'all' ? {} : { warRecord: { isCwl: s === 'cwl' } };
  const parts = await db.warParticipation.findMany({ where });
  return parts.map(p => ({
    playerTag: p.playerTag,
    name: p.name,
    attacksUsed: p.attacksUsed,
    attacksTotal: p.attacksTotal,
    starsEarned: p.starsEarned,
    threeStars: p.threeStars,
    destruction: p.destruction,
    excused: p.excused,
  }));
}

export const performanceRouter = router({
  leaderboard: publicProcedure
    .input(z.object({ scope }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await loadRows(ctx.prisma, input?.scope ?? 'all');
      return aggregatePerformance(rows);
    }),

  forPlayer: publicProcedure
    .input(z.object({ playerTag: z.string() }))
    .query(async ({ ctx, input }) => {
      const make = async (s: Scope) => {
        const rows = (await loadRows(ctx.prisma, s)).filter(
          r => r.playerTag === input.playerTag,
        );
        return aggregatePerformance(rows)[0] ?? null;
      };
      return {
        all: await make('all'),
        regular: await make('regular'),
        cwl: await make('cwl'),
      };
    }),

  playerWars: publicProcedure
    .input(z.object({ playerTag: z.string() }))
    .query(async ({ ctx, input }) => {
      const parts = await ctx.prisma.warParticipation.findMany({
        where: { playerTag: input.playerTag },
        include: { warRecord: true },
        orderBy: { warRecord: { endTime: 'desc' } },
      });
      return parts.map(p => ({
        participationId: p.id,
        warKey: p.warRecord.warKey,
        isCwl: p.warRecord.isCwl,
        opponent: p.warRecord.opponent,
        result: p.warRecord.result,
        endTime: p.warRecord.endTime,
        attacksUsed: p.attacksUsed,
        attacksTotal: p.attacksTotal,
        starsEarned: p.starsEarned,
        destruction: p.destruction,
        missed: p.attacksTotal - p.attacksUsed,
        excused: p.excused,
        excuseReason: p.excuseReason,
      }));
    }),

  setExcused: publicProcedure
    .input(z.object({
      participationId: z.string(),
      excused: z.boolean(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.warParticipation.update({
        where: { id: input.participationId },
        data: {
          excused: input.excused,
          excuseReason: input.excused ? (input.reason ?? null) : null,
        },
      });
      return { ok: true };
    }),
});
