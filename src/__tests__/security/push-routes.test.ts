import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  player: { findUnique: vi.fn() },
  pushSubscription: {
    upsert: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    findMany: vi.fn(async () => [] as { id: string }[]),
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: db }));

import { POST as subscribe } from '@/app/api/push/subscribe/route';
import { POST as unsubscribe } from '@/app/api/push/unsubscribe/route';
import { signSession } from '@/lib/session';
import { MAX_PUSH_SUBSCRIPTIONS_PER_LEADER } from '@/server/push-subscription';

const SECRET = 's'.repeat(32);
const LEADER = { playerTag: '#L1', name: 'Lea', role: 'Leader', status: 'Staying', sessionVersion: 0 };
const FCM = 'https://fcm.googleapis.com/fcm/send/abc123';
const KEYS = {
  p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
  auth: 'tBHItJI5svbpez7KI4CCXg',
};

function req(path: string, body: unknown, opts: { session?: boolean; raw?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.session) headers.cookie = `warroom_session=${signSession('#L1', SECRET, new Date())}`;
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers,
    body: opts.raw ?? JSON.stringify(body),
  }) as never;
}

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', SECRET);
  vi.stubEnv('ACCESS_LOCK', 'on');
  db.player.findUnique.mockImplementation(async ({ where }: { where: { playerTag: string } }) =>
    where.playerTag === LEADER.playerTag ? LEADER : null,
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('POST /api/push/subscribe (M2)', () => {
  it('rejects a request without a session', async () => {
    const res = await subscribe(req('/api/push/subscribe', { endpoint: FCM, keys: KEYS }));
    expect(res.status).toBe(401);
    expect(db.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it('rejects a session whose player is no longer a leader', async () => {
    db.player.findUnique.mockResolvedValue({ ...LEADER, role: 'Member' });
    const res = await subscribe(req('/api/push/subscribe', { endpoint: FCM, keys: KEYS }, { session: true }));
    expect(res.status).toBe(401);
    expect(db.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it('stores a valid subscription owned by the signed-in leader', async () => {
    const res = await subscribe(req('/api/push/subscribe', { endpoint: FCM, keys: KEYS }, { session: true }));
    expect(res.status).toBe(200);
    expect(db.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: FCM },
      update: { p256dh: KEYS.p256dh, auth: KEYS.auth, ownerTag: '#L1' },
      create: { endpoint: FCM, p256dh: KEYS.p256dh, auth: KEYS.auth, ownerTag: '#L1' },
    });
  });

  it.each([
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QGx',
    'https://wns2-by3p.notify.windows.com/w/?token=abc',
  ])('accepts the known push service %s', async endpoint => {
    const res = await subscribe(req('/api/push/subscribe', { endpoint, keys: KEYS }, { session: true }));
    expect(res.status).toBe(200);
  });

  it.each([
    ['plain http', 'http://fcm.googleapis.com/fcm/send/abc'],
    ['unknown host', 'https://attacker.example/collect'],
    ['lookalike suffix', 'https://fcm.googleapis.com.attacker.example/x'],
    ['lookalike prefix', 'https://evilfcm.googleapis.com/x'],
    ['internal address', 'https://169.254.169.254/latest'],
    ['too long', `${FCM}/${'a'.repeat(2048)}`],
  ])('rejects an endpoint that is %s', async (_label, endpoint) => {
    const res = await subscribe(req('/api/push/subscribe', { endpoint, keys: KEYS }, { session: true }));
    expect(res.status).toBe(400);
    expect(db.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it('rejects missing or malformed keys with 400 instead of a 500', async () => {
    for (const body of [{ endpoint: FCM }, { endpoint: FCM, keys: { p256dh: 'x', auth: '!!' } }, { endpoint: FCM, keys: { p256dh: 'a'.repeat(500), auth: KEYS.auth } }]) {
      const res = await subscribe(req('/api/push/subscribe', body, { session: true }));
      expect(res.status).toBe(400);
    }
    const bad = await subscribe(req('/api/push/subscribe', null, { session: true, raw: '{not json' }));
    expect(bad.status).toBe(400);
    expect(db.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it('caps the rows per leader by removing that leader\'s oldest extras', async () => {
    const ids = Array.from({ length: MAX_PUSH_SUBSCRIPTIONS_PER_LEADER + 2 }, (_, i) => ({ id: `s${i}` }));
    db.pushSubscription.findMany.mockResolvedValue(ids);
    const res = await subscribe(req('/api/push/subscribe', { endpoint: FCM, keys: KEYS }, { session: true }));
    expect(res.status).toBe(200);
    expect(db.pushSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerTag: '#L1' }, orderBy: { createdAt: 'desc' } }),
    );
    expect(db.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { ownerTag: '#L1', id: { in: ids.slice(MAX_PUSH_SUBSCRIPTIONS_PER_LEADER).map(r => r.id) } },
    });
  });
});

describe('POST /api/push/unsubscribe (M1)', () => {
  it('rejects a request without a session', async () => {
    const res = await unsubscribe(req('/api/push/unsubscribe', { endpoint: FCM }));
    expect(res.status).toBe(401);
    expect(db.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty body', {}],
    ['a Prisma filter object', { endpoint: { not: '' } }],
    ['a non-url string', { endpoint: 'abc' }],
  ])('rejects %s and never runs an unscoped delete', async (_label, body) => {
    const res = await unsubscribe(req('/api/push/unsubscribe', body, { session: true }));
    expect(res.status).toBe(400);
    expect(db.pushSubscription.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes only the caller\'s own row for that endpoint', async () => {
    const res = await unsubscribe(req('/api/push/unsubscribe', { endpoint: FCM }, { session: true }));
    expect(res.status).toBe(200);
    expect(db.pushSubscription.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { endpoint: FCM, ownerTag: '#L1' } });
  });
});
