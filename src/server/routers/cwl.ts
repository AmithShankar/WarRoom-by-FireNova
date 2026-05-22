import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { sortLineupByTownHall } from '@/lib/cwl-order';

const CWL_WAR_SIZE = 15;

export const cwlRouter = router({
  board: publicProcedure.query(async ({ ctx }) => {
    const players = await ctx.prisma.player.findMany({
      where: { status: { notIn: ['Kicked', 'Left'] } },
      orderBy: { townHallLevel: 'desc' },
    });
    return {
      lineup: players.filter(p => p.cwlSlot !== null),
      available: players.filter(p => p.cwlSlot === null && !p.cwlExcluded),
      excluded: players.filter(p => p.cwlSlot === null && p.cwlExcluded),
    };
  }),

  // Bulk move selected players to a bucket.
  bulkMove: publicProcedure
    .input(z.object({
      playerTags: z.array(z.string()),
      target: z.enum(['lineup', 'available', 'excluded']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.target === 'available') {
        await ctx.prisma.player.updateMany({
          where: { playerTag: { in: input.playerTags } },
          data: { cwlSlot: null, cwlExcluded: false },
        });
      } else if (input.target === 'excluded') {
        await ctx.prisma.player.updateMany({
          where: { playerTag: { in: input.playerTags } },
          data: { cwlSlot: null, cwlExcluded: true },
        });
      } else {
        // lineup - fill the first empty slots in order
        const occupied = await ctx.prisma.player.findMany({
          where: { cwlSlot: { not: null } }, select: { cwlSlot: true },
        });
        const taken = new Set(occupied.map(o => o.cwlSlot));
        const empty: number[] = [];
        for (let s = 1; s <= CWL_WAR_SIZE; s++) if (!taken.has(s)) empty.push(s);
        let i = 0;
        for (const tag of input.playerTags) {
          if (i >= empty.length) break;
          await ctx.prisma.player.update({
            where: { playerTag: tag },
            data: { cwlSlot: empty[i], cwlExcluded: false },
          });
          i++;
        }
      }
      return { ok: true };
    }),

  // Add one player to the lineup, then re-number every slot by Town Hall desc.
  addToLineup: publicProcedure
    .input(z.object({ playerTag: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.prisma.player.findMany({
        where: { cwlSlot: { not: null } },
      });
      if (current.some(p => p.playerTag === input.playerTag)) return { ok: true };
      if (current.length >= CWL_WAR_SIZE) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lineup is full (15/15).' });
      }
      const added = await ctx.prisma.player.findUniqueOrThrow({
        where: { playerTag: input.playerTag },
      });
      const ordered = sortLineupByTownHall([...current, added]);
      await ctx.prisma.$transaction([
        ctx.prisma.player.updateMany({
          where: { playerTag: { in: ordered } },
          data: { cwlSlot: null },
        }),
        ...ordered.map((tag, i) =>
          ctx.prisma.player.update({
            where: { playerTag: tag },
            data: { cwlSlot: i + 1, cwlExcluded: false },
          }),
        ),
      ]);
      return { ok: true };
    }),

  // Apply a manual lineup order - orderedTags[i] gets slot i + 1.
  reorderLineup: publicProcedure
    .input(z.object({ orderedTags: z.array(z.string()).max(CWL_WAR_SIZE) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction([
        ctx.prisma.player.updateMany({
          where: { playerTag: { in: input.orderedTags } },
          data: { cwlSlot: null },
        }),
        ...input.orderedTags.map((tag, i) =>
          ctx.prisma.player.update({
            where: { playerTag: tag },
            data: { cwlSlot: i + 1 },
          }),
        ),
      ]);
      return { ok: true };
    }),

  // Clear the entire board - every player returns to Available.
  reset: publicProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.player.updateMany({
      data: { cwlSlot: null, cwlExcluded: false },
    });
    return { ok: true };
  }),
});
