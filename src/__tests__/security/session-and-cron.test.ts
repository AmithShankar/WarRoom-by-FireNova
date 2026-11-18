import { afterEach, describe, expect, it, vi } from 'vitest';

const timingSafeEqual = vi.hoisted(() => vi.fn());
vi.mock('node:crypto', async importOriginal => {
  const real = await importOriginal<typeof import('node:crypto')>();
  timingSafeEqual.mockImplementation(real.timingSafeEqual);
  return { ...real, default: { ...real, timingSafeEqual }, timingSafeEqual };
});
const runSync = vi.fn();
vi.mock('@/server/coc/sync', () => ({ runSync: () => runSync() }));

import { GET as cronGet } from '@/app/api/cron/sync/route';
import { createContext, readClientIp } from '@/server/context';
import { signSession, readSession } from '@/lib/session';
import { router, leaderProcedure } from '@/server/trpc';
import { authRouter } from '@/server/routers/auth';
import { QueryClient } from '@tanstack/react-query';
import { clearLeaderData, CACHE_KEY } from '@/lib/query-persist';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('cron secret compare (L2)', () => {
  const SECRET = 'c'.repeat(32);
  const call = (auth?: string) =>
    cronGet(new Request('http://x/api/cron/sync', { headers: auth ? { authorization: auth } : {} }));

  it('uses timingSafeEqual on equal-length buffers', async () => {
    vi.stubEnv('CRON_SECRET', SECRET);
    runSync.mockResolvedValue({ membersSynced: 1 });
    expect((await call(`Bearer ${SECRET}`)).status).toBe(200);
    expect(timingSafeEqual).toHaveBeenCalled();
    for (const [a, b] of timingSafeEqual.mock.calls as [Buffer, Buffer][]) expect(a.length).toBe(b.length);
  });

  it('rejects wrong, longer, shorter and missing headers', async () => {
    vi.stubEnv('CRON_SECRET', SECRET);
    for (const h of [`Bearer ${'d'.repeat(32)}`, `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(1)}`, undefined]) {
      expect((await call(h)).status).toBe(401);
    }
    expect(runSync).not.toHaveBeenCalled();
  });

  it('does not echo the sync error in the 500 body (L7)', async () => {
    vi.stubEnv('CRON_SECRET', SECRET);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    runSync.mockRejectedValue(new Error('CoC API 403: invalidIp 1.2.3.4'));
    const res = await call(`Bearer ${SECRET}`);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('1.2.3.4');
  });
});

describe('readClientIp (L3)', () => {
  const ip = (headers: Record<string, string>) => readClientIp(new Request('http://x', { headers }));

  it('prefers the Vercel-set x-real-ip over a spoofable x-forwarded-for', () => {
    expect(ip({ 'x-forwarded-for': '6.6.6.6, 1.1.1.1', 'x-real-ip': '1.1.1.1' })).toBe('1.1.1.1');
  });
  it('falls back to x-vercel-forwarded-for, then x-forwarded-for', () => {
    expect(ip({ 'x-vercel-forwarded-for': '2.2.2.2', 'x-forwarded-for': '6.6.6.6' })).toBe('2.2.2.2');
    expect(ip({ 'x-forwarded-for': '3.3.3.3, 4.4.4.4' })).toBe('3.3.3.3');
    expect(ip({})).toBeNull();
  });
});

describe('session revocation (L4)', () => {
  const SECRET = 's'.repeat(32);
  const LEADER = { playerTag: '#L1', name: 'Lea', role: 'Leader', status: 'Staying', sessionVersion: 3 };

  function ctx(sessionVersion: number) {
    const prisma = {
      player: {
        findUnique: vi.fn(async () => LEADER),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    return { prisma, ctx: { prisma, sessionTag: '#L1', sessionVersion, resHeaders: new Headers(), clientIp: null } as never };
  }

  it('carries the session version in the signed cookie', () => {
    const v = signSession('#L1', SECRET, new Date(), 3);
    expect(readSession(v, SECRET, new Date())).toEqual({ tag: '#L1', version: 3 });
    vi.stubEnv('SESSION_SECRET', SECRET);
    const c = createContext({ req: new Request('http://x', { headers: { cookie: `warroom_session=${v}` } }), resHeaders: new Headers() });
    expect(c.sessionVersion).toBe(3);
  });

  it('rejects a cookie whose version no longer matches the player', async () => {
    vi.stubEnv('ACCESS_LOCK', 'on');
    const r = router({ edit: leaderProcedure.mutation(() => 'ok') });
    await expect(r.createCaller(ctx(2).ctx).edit()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(r.createCaller(ctx(3).ctx).edit()).resolves.toBe('ok');
  });

  it('sign-out bumps the version so every copy of the cookie stops working', async () => {
    vi.stubEnv('ACCESS_LOCK', 'on');
    const { prisma, ctx: c } = ctx(3);
    await authRouter.createCaller(c).signOut();
    expect(prisma.player.updateMany).toHaveBeenCalledWith({
      where: { playerTag: '#L1', sessionVersion: 3 },
      data: { sessionVersion: { increment: 1 } },
    });
  });

  it('a stale cookie cannot bump the version (no forced sign-out of the real leader)', async () => {
    vi.stubEnv('ACCESS_LOCK', 'on');
    const { prisma, ctx: c } = ctx(1);
    await authRouter.createCaller(c).signOut();
    expect(prisma.player.updateMany).not.toHaveBeenCalled();
  });
});

describe('clearLeaderData (L4)', () => {
  it('removes the persisted cache and all cached query data', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['roster', 'list'], [{ notes: 'private' }]);
    const storage = { removeItem: vi.fn() };
    await clearLeaderData(qc, storage);
    expect(storage.removeItem).toHaveBeenCalledWith(CACHE_KEY);
    expect(qc.getQueryData(['roster', 'list'])).toBeUndefined();
  });

  it('still clears the query cache when storage throws', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['x'], 1);
    await clearLeaderData(qc, { removeItem: () => { throw new Error('blocked'); } });
    expect(qc.getQueryData(['x'])).toBeUndefined();
  });
});
