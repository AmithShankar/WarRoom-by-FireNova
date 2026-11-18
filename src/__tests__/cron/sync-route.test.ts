import { afterEach, describe, expect, it, vi } from 'vitest';

const runSync = vi.fn();
vi.mock('@/server/coc/sync', () => ({ runSync: () => runSync() }));

import { GET } from '@/app/api/cron/sync/route';

const call = (auth?: string) =>
  GET(new Request('http://x/api/cron/sync', { headers: auth ? { authorization: auth } : {} }));

describe('cron sync auth', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    runSync.mockReset();
  });

  it('rejects Bearer undefined when CRON_SECRET is unset', async () => {
    vi.stubEnv('CRON_SECRET', '');
    delete process.env.CRON_SECRET;
    expect((await call('Bearer undefined')).status).toBe(401);
    expect(runSync).not.toHaveBeenCalled();
  });

  it('rejects a short secret even when it matches', async () => {
    vi.stubEnv('CRON_SECRET', 'short');
    expect((await call('Bearer short')).status).toBe(401);
    expect(runSync).not.toHaveBeenCalled();
  });

  it('runs sync with a long matching secret', async () => {
    vi.stubEnv('CRON_SECRET', 'a'.repeat(16));
    runSync.mockResolvedValue({});
    expect((await call(`Bearer ${'a'.repeat(16)}`)).status).toBe(200);
  });
});
