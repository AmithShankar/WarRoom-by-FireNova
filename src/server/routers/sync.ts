import { router, publicProcedure, leaderProcedure } from '../trpc';
import { runSync } from '../coc/sync';
import { MANUAL_SYNC_COOLDOWN_MS } from '@/lib/sync-timing';

export const syncRouter = router({
  status: publicProcedure.query(({ ctx }) =>
    ctx.prisma.syncLog.findFirst({ orderBy: { startedAt: 'desc' } }),
  ),

  // Leader-only (H2). Visitors rely on the scheduled cron sync (/api/cron/sync, CRON_SECRET).
  // Even a leader can start at most one manual sync per MANUAL_SYNC_COOLDOWN_MS.
  run: leaderProcedure.mutation(async () => {
    const result = await runSync({ minIntervalMs: MANUAL_SYNC_COOLDOWN_MS });
    return { ok: true, ...result };
  }),
});
