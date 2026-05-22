import { router, publicProcedure } from '../trpc';
import { runSync } from '../coc/sync';

export const syncRouter = router({
  status: publicProcedure.query(({ ctx }) =>
    ctx.prisma.syncLog.findFirst({ orderBy: { startedAt: 'desc' } }),
  ),

  run: publicProcedure.mutation(async () => {
    const result = await runSync();
    return { ok: true, ...result };
  }),
});
