import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, viewerProcedure, leaderProcedure } from '../trpc';
import { stripLeaderOnlyFields } from '../leader-only';
import { sortLineupByTownHall } from '@/lib/cwl-order';

const CWL_WAR_SIZE = 15;

export const cwlRouter = router({
  board: viewerProcedure.query(async ({ ctx }) => {
    const players = stripLeaderOnlyFields(
      await ctx.prisma.player.findMany({
        where: { status: { notIn: ['Kicked', 'Left'] } },
        orderBy: { townHallLevel: 'desc' },
      }),
      ctx.isLeader,
    );
    return {
      lineup: players.filter(p => p.cwlSlot !== null),
      available: players.filter(p => p.cwlSlot === null && !p.cwlExcluded),
      excluded: players.filter(p => p.cwlSlot === null && p.cwlExcluded),
    };
  }),

  // Bulk move selected players to a bucket.
  bulkMove: leaderProcedure
    .input(z.object({
      playerTags: z.array(z.string().max(20)).max(60),
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
      const editorName = ctx.editor?.name ?? null;
      await ctx.prisma.clanActivity.create({
        data: {
          date: new Date(),
          type: 'cwl',
          summary: `CWL: ${input.playerTags.length} player(s) moved to ${input.target}`,
          editorName,
        },
      });
      return { ok: true };
    }),

  // Add one player to the lineup, then re-number every slot by Town Hall desc.
  addToLineup: leaderProcedure
    .input(z.object({ playerTag: z.string().max(20) }))
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
      const editorName = ctx.editor?.name ?? null;
      await ctx.prisma.clanActivity.create({
        data: {
          date: new Date(),
          type: 'cwl',
          player: added.name,
          summary: `${added.name} added to CWL lineup`,
          editorName,
        },
      });
      return { ok: true };
    }),

  // Apply a manual lineup order - orderedTags[i] gets slot i + 1.
  reorderLineup: leaderProcedure
    .input(z.object({ orderedTags: z.array(z.string().max(20)).max(CWL_WAR_SIZE) }))
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
      const editorName = ctx.editor?.name ?? null;
      await ctx.prisma.clanActivity.create({
        data: {
          date: new Date(),
          type: 'cwl',
          summary: `CWL lineup reordered`,
          editorName,
        },
      });
      return { ok: true };
    }),

  // Clear the entire board - every player returns to Available.
  reset: leaderProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.player.updateMany({
      data: { cwlSlot: null, cwlExcluded: false },
    });
    const editorName = ctx.editor?.name ?? null;
    await ctx.prisma.clanActivity.create({
      data: {
        date: new Date(),
        type: 'cwl',
        summary: `CWL lineup cleared`,
        editorName,
      },
    });
    return { ok: true };
  }),
});
