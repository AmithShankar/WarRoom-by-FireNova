import { describe, it, expect, afterEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { isLockOn, canEdit } from '@/lib/access';
import { router, leaderProcedure } from '@/server/trpc';
import { createContext } from '@/server/context';
import { signSession } from '@/lib/session';

describe('isLockOn', () => {
  it('is true only for exact on', () => {
    expect(isLockOn({ ACCESS_LOCK: 'on' })).toBe(true);
    expect(isLockOn({})).toBe(false);
    expect(isLockOn({ ACCESS_LOCK: 'off' })).toBe(false);
    expect(isLockOn({ ACCESS_LOCK: 'ON' })).toBe(false);
    expect(isLockOn({ ACCESS_LOCK: '' })).toBe(false);
  });
});

describe('canEdit', () => {
  it('allows current Leader and CoLeader', () => {
    expect(canEdit({ role: 'Leader', status: 'Active' })).toBe(true);
    expect(canEdit({ role: 'CoLeader', status: 'New' })).toBe(true);
  });
  it('rejects Elder and Member', () => {
    expect(canEdit({ role: 'Elder', status: 'Active' })).toBe(false);
    expect(canEdit({ role: 'Member', status: 'Active' })).toBe(false);
  });
  it('rejects a CoLeader who Left or was Kicked', () => {
    expect(canEdit({ role: 'CoLeader', status: 'Left' })).toBe(false);
    expect(canEdit({ role: 'CoLeader', status: 'Kicked' })).toBe(false);
  });
  it('rejects null', () => expect(canEdit(null)).toBe(false));
});

type FakePlayer = { playerTag: string; name: string; role: string; status: string };

function fakeCtx(sessionTag: string | null, players: FakePlayer[]) {
  const prisma = {
    player: {
      findUnique: vi.fn(async ({ where }: { where: { playerTag: string } }) =>
        players.find((p) => p.playerTag === where.playerTag) ?? null,
      ),
    },
  };
  return { prisma, sessionTag, resHeaders: new Headers() } as never;
}

const testRouter = router({
  edit: leaderProcedure.mutation(({ ctx }) => ({ editor: ctx.editor })),
});

describe('leaderProcedure', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('passes with no session when the lock is off', async () => {
    vi.stubEnv('ACCESS_LOCK', 'off');
    const res = await testRouter.createCaller(fakeCtx(null, [])).edit();
    expect(res.editor).toBeNull();
  });

  it('rejects no session when the lock is on', async () => {
    vi.stubEnv('ACCESS_LOCK', 'on');
    await expect(testRouter.createCaller(fakeCtx(null, [])).edit()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('rejects a session for a player now Elder', async () => {
    vi.stubEnv('ACCESS_LOCK', 'on');
    const ctx = fakeCtx('#A', [{ playerTag: '#A', name: 'A', role: 'Elder', status: 'Active' }]);
    const err = await testRouter.createCaller(ctx).edit().catch((e) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('rejects a session for a CoLeader who Left', async () => {
    vi.stubEnv('ACCESS_LOCK', 'on');
    const ctx = fakeCtx('#A', [{ playerTag: '#A', name: 'A', role: 'CoLeader', status: 'Left' }]);
    await expect(testRouter.createCaller(ctx).edit()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects a session for an unknown player', async () => {
    vi.stubEnv('ACCESS_LOCK', 'on');
    await expect(testRouter.createCaller(fakeCtx('#Z', [])).edit()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('passes a current CoLeader and sets the editor', async () => {
    vi.stubEnv('ACCESS_LOCK', 'on');
    const ctx = fakeCtx('#A', [{ playerTag: '#A', name: 'Ann', role: 'CoLeader', status: 'Active' }]);
    const res = await testRouter.createCaller(ctx).edit();
    expect(res.editor).toEqual({ tag: '#A', name: 'Ann' });
  });
});

describe('createContext', () => {
  const secret = 's'.repeat(32);
  const req = (cookie?: string) =>
    new Request('http://localhost/api/trpc/x', { headers: cookie ? { cookie } : {} });

  afterEach(() => vi.unstubAllEnvs());

  it('reads the session tag from the cookie', () => {
    vi.stubEnv('SESSION_SECRET', secret);
    const value = signSession('#ABC', secret, new Date());
    const ctx = createContext({ req: req(`foo=1; warroom_session=${value}; bar=2`), resHeaders: new Headers() });
    expect(ctx.sessionTag).toBe('#ABC');
  });

  it('is null without a cookie', () => {
    vi.stubEnv('SESSION_SECRET', secret);
    expect(createContext({ req: req(), resHeaders: new Headers() }).sessionTag).toBeNull();
  });

  it('is null when the secret is missing or short', () => {
    const value = signSession('#ABC', 'short', new Date());
    vi.stubEnv('SESSION_SECRET', 'short');
    expect(createContext({ req: req(`warroom_session=${value}`), resHeaders: new Headers() }).sessionTag).toBeNull();
    vi.stubEnv('SESSION_SECRET', '');
    expect(createContext({ req: req(`warroom_session=${value}`), resHeaders: new Headers() }).sessionTag).toBeNull();
  });
});
