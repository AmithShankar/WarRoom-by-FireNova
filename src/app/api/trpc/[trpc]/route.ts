import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';
import { MAX_BATCH_SIZE } from '@/lib/trpc-limits';

export const maxDuration = 60;

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    maxBatchSize: MAX_BATCH_SIZE,
    // The client only sees a generic message for internal errors (errorFormatter in trpc.ts);
    // the details are logged here, server-side.
    onError: ({ error, path }) => {
      if (error.code === 'INTERNAL_SERVER_ERROR') console.error(`tRPC ${path ?? '<batch>'} failed:`, error.cause ?? error);
    },
  });

export { handler as GET, handler as POST };
