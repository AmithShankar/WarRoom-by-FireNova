import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { raidTable } from '@/lib/events';
import { clanGamesWindow, clanGamesPoints } from '@/lib/clan-games';

const DAY_MS = 24 * 60 * 60_000;
const CURRENT = { status: { notIn: ['Kicked' as const, 'Left' as const] } };

export const eventsRouter = router({
  // Distinct raid weekends we have data for, newest first.
  raidSeasons: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.raidParticipation.findMany({
      distinct: ['seasonStart'],
      select: { seasonStart: true, seasonEnd: true },
      orderBy: { seasonStart: 'desc' },
    });
  }),

  raid: publicProcedure
    .input(z.object({ seasonStart: z.date() }))
    .query(async ({ ctx, input }) => {
      const [rows, members] = await Promise.all([
        ctx.prisma.raidParticipation.findMany({ where: { seasonStart: input.seasonStart } }),
        ctx.prisma.player.findMany({
          where: CURRENT,
          select: { playerTag: true, name: true, joinedAt: true },
        }),
      ]);
      if (rows.length === 0) return [];
      return raidTable(rows, members, rows[0].seasonEnd);
    }),

  // Months (0 based, UTC) that have any clan games snapshots, newest first.
  clanGamesMonths: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.$queryRaw<{ year: number; month: number }[]>`
      SELECT DISTINCT
        EXTRACT(YEAR FROM "takenAt")::int AS year,
        (EXTRACT(MONTH FROM "takenAt")::int - 1) AS month
      FROM "ClanGamesSnapshot"
      ORDER BY year DESC, month DESC`;
    return rows;
  }),

  clanGames: publicProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(0).max(11) }))
    .query(async ({ ctx, input }) => {
      const window = clanGamesWindow(input.year, input.month);
      const members = await ctx.prisma.player.findMany({
        where: CURRENT,
        select: { playerTag: true, name: true },
      });
      // Baselines start on the 15th, so this month's snapshots are enough.
      const snaps = await ctx.prisma.clanGamesSnapshot.findMany({
        where: {
          playerTag: { in: members.map(m => m.playerTag) },
          takenAt: {
            gte: new Date(Date.UTC(input.year, input.month, 1)),
            lte: new Date(window.end.getTime() + DAY_MS),
          },
        },
        select: { playerTag: true, value: true, takenAt: true },
      });
      const byTag = new Map<string, { value: number; takenAt: Date }[]>();
      for (const s of snaps) {
        const list = byTag.get(s.playerTag) ?? [];
        list.push(s);
        byTag.set(s.playerTag, list);
      }
      return members
        .map(m => ({
          playerTag: m.playerTag,
          name: m.name,
          points: clanGamesPoints(byTag.get(m.playerTag) ?? [], window),
        }))
        .sort((a, b) => {
          if (a.points === null) return b.points === null ? 0 : 1;
          if (b.points === null) return -1;
          return b.points - a.points;
        });
    }),
});
