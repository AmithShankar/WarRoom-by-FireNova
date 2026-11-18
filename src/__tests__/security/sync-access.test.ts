import { afterEach, describe, expect, it, vi } from 'vitest';

const runSync = vi.fn(async (_opts?: unknown) => ({ membersSynced: 3 }));
vi.mock('@/server/coc/sync', () => ({ runSync: (opts?: unknown) => runSync(opts) }));

import { syncRouter } from '@/server/routers/sync';
import { MANUAL_SYNC_COOLDOWN_MS, syncClaimDecision } from '@/lib/sync-timing';
import { claimSync, releaseSync, SYNC_LOCK_ID, SYNC_LOCK_TTL_MS } from '@/server/coc/sync-claim';

type P = { playerTag: string; name: string; role: string; status: string; sessionVersion?: number };

function ctx(sessionTag: string | null, players: P[]) {
  return {
    prisma: {
      player: {
        findUnique: vi.fn(async ({ where }: { where: { playerTag: string } }) =>
          players.find(p => p.playerTag === where.playerTag) ?? null,
        ),
      },
      syncLog: { findFirst: vi.fn(async () => null) },
    },
    sessionTag,
    sessionVersion: 0,
    resHeaders: new Headers(),
    clientIp: null,
  } as never;
}

const LEADER: P = { playerTag: '#L1', name: 'Lea', role: 'Leader', status: 'Staying', sessionVersion: 0 };

describe('sync.run access (H2)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    runSync.mockClear();
  });

  it('rejects an anonymous visitor and never starts a sync', async () => {
    vi.stubEnv('ACCESS_LOCK', 'on');
    await expect(syncRouter.createCaller(ctx(null, [])).run()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(runSync).not.toHaveBeenCalled();
  });

  it('rejects a visitor when ACCESS_LOCK is unset (fail closed)', async () => {
    vi.stubEnv('ACCESS_LOCK', '');
    delete process.env.ACCESS_LOCK;
    await expect(syncRouter.createCaller(ctx(null, [])).run()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(runSync).not.toHaveBeenCalled();
  });

  it('rejects a signed-in Elder', async () => {
    vi.stubEnv('ACCESS_LOCK', 'on');
    const elder = { ...LEADER, role: 'Elder' };
    await expect(syncRouter.createCaller(ctx('#L1', [elder])).run()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('lets a leader sync, with the manual cooldown applied', async () => {
    vi.stubEnv('ACCESS_LOCK', 'on');
    const res = await syncRouter.createCaller(ctx('#L1', [LEADER])).run();
    expect(res.ok).toBe(true);
    expect(runSync).toHaveBeenCalledWith({ minIntervalMs: MANUAL_SYNC_COOLDOWN_MS });
    expect(MANUAL_SYNC_COOLDOWN_MS).toBe(5 * 60_000);
  });
});

describe('syncClaimDecision (lock row -> reason)', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const ahead = (ms: number) => new Date(now.getTime() + ms);

  it('allows the first ever sync', () => {
    expect(syncClaimDecision(null, now, MANUAL_SYNC_COOLDOWN_MS)).toBe('ok');
    expect(syncClaimDecision({ lockedUntil: null, lastStartedAt: null }, now, MANUAL_SYNC_COOLDOWN_MS)).toBe('ok');
  });
  it('refuses while the lock is held, for cron and manual alike', () => {
    const held = { lockedUntil: ahead(60_000), lastStartedAt: ago(30_000) };
    expect(syncClaimDecision(held, now, 0)).toBe('in_progress');
    expect(syncClaimDecision(held, now, MANUAL_SYNC_COOLDOWN_MS)).toBe('in_progress');
  });
  it('treats an expired lock as free', () => {
    expect(syncClaimDecision({ lockedUntil: ago(1), lastStartedAt: ago(10 * 60_000) }, now, MANUAL_SYNC_COOLDOWN_MS)).toBe('ok');
  });
  it('refuses a manual sync started within the cooldown', () => {
    expect(syncClaimDecision({ lockedUntil: null, lastStartedAt: ago(2 * 60_000) }, now, MANUAL_SYNC_COOLDOWN_MS)).toBe('cooldown');
  });
  it('allows a manual sync once the cooldown has passed', () => {
    expect(syncClaimDecision({ lockedUntil: null, lastStartedAt: ago(6 * 60_000) }, now, MANUAL_SYNC_COOLDOWN_MS)).toBe('ok');
  });
  it('lets cron (no cooldown) run right after a finished sync', () => {
    expect(syncClaimDecision({ lockedUntil: null, lastStartedAt: ago(60_000) }, now, 0)).toBe('ok');
  });
});

describe('claimSync (single lock row, one conditional update)', () => {
  const now = new Date('2026-11-18T12:00:00Z');

  // No $transaction / $executeRaw / $queryRaw on purpose: the claim must not need them.
  function fakeDb(count: number, row: { lockedUntil: Date | null; lastStartedAt: Date | null } | null = null) {
    return {
      syncLock: {
        createMany: vi.fn(async () => ({ count: 0 })),
        updateMany: vi.fn(async () => ({ count })),
        findUnique: vi.fn(async () => row),
      },
      syncLog: { create: vi.fn(async () => ({ id: 'log1' })) },
    };
  }

  it('claims with one atomic conditional update on the lock row, then creates the log', async () => {
    const db = fakeDb(1);
    const res = await claimSync(db as never, now, MANUAL_SYNC_COOLDOWN_MS, 'manual');
    expect(res).toMatchObject({ ok: true, logId: 'log1' });
    const token = (res as { token: string }).token;
    expect(token).toMatch(/^manual:/);
    expect(db.syncLock.createMany).toHaveBeenCalledWith({ data: [{ id: SYNC_LOCK_ID }], skipDuplicates: true });
    expect(db.syncLock.updateMany).toHaveBeenCalledWith({
      where: {
        id: SYNC_LOCK_ID,
        AND: [
          { OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
          { OR: [{ lastStartedAt: null }, { lastStartedAt: { lte: new Date(now.getTime() - MANUAL_SYNC_COOLDOWN_MS) } }] },
        ],
      },
      data: { lockedUntil: new Date(now.getTime() + SYNC_LOCK_TTL_MS), startedBy: token, lastStartedAt: now },
    });
    expect(db.syncLog.create).toHaveBeenCalledWith({ data: { status: 'success', startedAt: now } });
  });

  it('cron claims without the cooldown condition', async () => {
    const db = fakeDb(1);
    await claimSync(db as never, now, 0, 'cron');
    const arg = (db.syncLock.updateMany.mock.calls as unknown[][])[0][0] as { where: { AND: unknown[] } };
    expect(arg.where.AND).toEqual([{ OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] }]);
  });

  it('reports in_progress and writes no log when the lock is held', async () => {
    const db = fakeDb(0, { lockedUntil: new Date(now.getTime() + 60_000), lastStartedAt: now });
    expect(await claimSync(db as never, now, 0, 'cron')).toEqual({ ok: false, reason: 'in_progress' });
    expect(db.syncLog.create).not.toHaveBeenCalled();
  });

  it('reports cooldown and writes no log when a sync started recently', async () => {
    const db = fakeDb(0, { lockedUntil: null, lastStartedAt: new Date(now.getTime() - 60_000) });
    expect(await claimSync(db as never, now, MANUAL_SYNC_COOLDOWN_MS, 'manual')).toEqual({ ok: false, reason: 'cooldown' });
    expect(db.syncLog.create).not.toHaveBeenCalled();
  });

  it('releaseSync frees the lock only for the holder token', async () => {
    const db = { syncLock: { updateMany: vi.fn(async () => ({ count: 1 })) } };
    await releaseSync(db as never, 'manual:abc');
    expect(db.syncLock.updateMany).toHaveBeenCalledWith({
      where: { id: SYNC_LOCK_ID, startedBy: 'manual:abc' },
      data: { lockedUntil: null },
    });
  });
});
