import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';
import { runSync } from './coc/sync';
import { prisma } from '@/lib/prisma';

const t = initTRPC.context<Context>().create({ transformer: superjson });

const STALE_MS = 30 * 60_000;       // trigger sync if last success > 30 min ago
const CHECK_COOLDOWN_MS = 60_000;   // at most one DB staleness check per minute per instance

let lastCheckedAt = 0;
let syncRunning = false;

async function syncIfStale(): Promise<void> {
  const now = Date.now();
  if (syncRunning || now - lastCheckedAt < CHECK_COOLDOWN_MS) return;
  lastCheckedAt = now;

  const latest = await prisma.syncLog.findFirst({
    where: { status: 'success' },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true },
  });

  const age = now - (latest?.startedAt.getTime() ?? 0);
  if (age < STALE_MS) return;

  syncRunning = true;
  runSync()
    .catch(err => console.warn('Background sync failed:', err instanceof Error ? err.message : err))
    .finally(() => { syncRunning = false; });
}

const revalidateMiddleware = t.middleware(({ next }) => {
  void syncIfStale();
  return next();
});

export const router = t.router;
export const publicProcedure = t.procedure.use(revalidateMiddleware);
