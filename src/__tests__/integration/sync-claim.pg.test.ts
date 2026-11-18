/**
 * Real-Postgres check of the sync claim (I2). Skipped unless SYNC_LOCK_TEST_DATABASE_URL points
 * at a throwaway database that has the migrations applied. Never point it at production.
 *
 *   SYNC_LOCK_TEST_DATABASE_URL=postgresql://... node_modules/.bin/vitest run src/__tests__/integration
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/lib/prisma';
import { claimSync, releaseSync, SYNC_LOCK_ID } from '@/server/coc/sync-claim';
import { MANUAL_SYNC_COOLDOWN_MS } from '@/lib/sync-timing';

const url = process.env.SYNC_LOCK_TEST_DATABASE_URL;

describe.skipIf(!url)('claimSync on a real Postgres', () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  beforeEach(async () => {
    await db.syncLog.deleteMany({});
    await db.syncLock.deleteMany({});
  });
  afterAll(async () => {
    await db.syncLog.deleteMany({});
    await db.syncLock.deleteMany({});
    await db.$disconnect();
  });

  it('lets exactly one of 10 concurrent claims win (mixed cron and manual)', async () => {
    const now = new Date();
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        claimSync(db, now, i % 2 ? MANUAL_SYNC_COOLDOWN_MS : 0, i % 2 ? 'manual' : 'cron'),
      ),
    );
    expect(results.filter(r => r.ok)).toHaveLength(1);
    expect(results.filter(r => !r.ok).every(r => !r.ok && r.reason === 'in_progress')).toBe(true);
    expect(await db.syncLog.count()).toBe(1);
  });

  it('repeats the 10-way race 5 times with exactly one winner each time', async () => {
    for (let round = 0; round < 5; round++) {
      await db.syncLock.deleteMany({});
      const results = await Promise.all(Array.from({ length: 10 }, () => claimSync(db, new Date(), 0, 'cron')));
      expect(results.filter(r => r.ok)).toHaveLength(1);
    }
  });

  it('applies the manual cooldown after release, but lets cron through; cron and manual never overlap', async () => {
    const first = await claimSync(db, new Date(), MANUAL_SYNC_COOLDOWN_MS, 'manual');
    expect(first.ok).toBe(true);
    // While held, even cron is refused.
    expect(await claimSync(db, new Date(), 0, 'cron')).toEqual({ ok: false, reason: 'in_progress' });
    if (first.ok) await releaseSync(db, first.token);

    expect(await claimSync(db, new Date(), MANUAL_SYNC_COOLDOWN_MS, 'manual')).toEqual({ ok: false, reason: 'cooldown' });
    const cron = await claimSync(db, new Date(), 0, 'cron');
    expect(cron.ok).toBe(true);
    if (cron.ok) await releaseSync(db, cron.token);

    // Once the cooldown has passed, a manual sync is allowed again.
    const later = new Date(Date.now() + MANUAL_SYNC_COOLDOWN_MS + 1000);
    expect((await claimSync(db, later, MANUAL_SYNC_COOLDOWN_MS, 'manual')).ok).toBe(true);
  });

  it('an expired lock is reclaimable, and the stale holder cannot release the new lock', async () => {
    const t0 = new Date();
    const a = await claimSync(db, t0, 0, 'cron');
    expect(a.ok).toBe(true);
    const b = await claimSync(db, new Date(t0.getTime() + 10 * 60_000), 0, 'cron');
    expect(b.ok).toBe(true);
    if (a.ok) await releaseSync(db, a.token);
    const row = await db.syncLock.findUnique({ where: { id: SYNC_LOCK_ID } });
    expect(row?.lockedUntil).not.toBeNull();
    expect(row?.startedBy).toBe(b.ok ? b.token : undefined);
  });
});
