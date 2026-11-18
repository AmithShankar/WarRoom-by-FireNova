import { afterEach, describe, expect, it, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { router, publicProcedure } from '@/server/trpc';
import { GET as trpcGet } from '@/app/api/trpc/[trpc]/route';
import { MAX_BATCH_SIZE } from '@/lib/trpc-limits';
import { syncErrorCode } from '@/server/coc/sync-errors';
import { CocApiError } from '@/server/coc/client';

const leaky = router({
  boom: publicProcedure.query(() => {
    throw new Error('Invalid `prisma.player.findUniqueOrThrow()` invocation: connection to db-secret-host:5432 refused');
  }),
  bad: publicProcedure.query(() => {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lineup is full (15/15).' });
  }),
});

const call = (path: string) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: new Request(`http://localhost/api/trpc/${path}`),
    router: leaky,
    createContext: () => ({}) as never,
    onError: () => {},
  });

describe('error sanitising (L7)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('replaces internal error details with a generic message', async () => {
    const res = await call('boom');
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toContain('db-secret-host');
    expect(text).not.toContain('prisma');
    expect(text).toContain('Something went wrong');
  });

  it('keeps intentional client-facing messages', async () => {
    const text = await (await call('bad')).text();
    expect(text).toContain('Lineup is full (15/15).');
  });

  it('maps sync failures to short codes instead of raw upstream text', () => {
    expect(syncErrorCode(new CocApiError(403, 'CoC API 403: {"reason":"accessDenied.invalidIp","message":"Invalid authorization: API key does not allow access from IP 1.2.3.4"}'))).toBe('coc_403');
    expect(syncErrorCode(new CocApiError(429, 'rate limited'))).toBe('coc_429');
    expect(syncErrorCode(new CocApiError(0, 'COC_API_TOKEN is not set'))).toBe('config');
    expect(syncErrorCode(new Error('COC_CLAN_TAG is not set'))).toBe('config');
    expect(syncErrorCode(new Error('something with 1.2.3.4'))).toBe('unknown');
  });
});

describe('batch cap (L8)', () => {
  it('rejects a batch larger than the cap before running any procedure', async () => {
    const paths = Array.from({ length: MAX_BATCH_SIZE + 1 }, () => 'auth.me').join(',');
    const input = encodeURIComponent(JSON.stringify({}));
    const res = await trpcGet(new Request(`http://localhost/api/trpc/${paths}?batch=1&input=${input}`));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('Batch call exceeds maximum size');
  });

  it('uses a cap of 10', () => {
    expect(MAX_BATCH_SIZE).toBe(10);
  });
});
