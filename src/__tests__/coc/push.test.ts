import { describe, it, expect } from 'vitest';
import { buildNotificationPayload } from '@/server/coc/push';

describe('buildNotificationPayload', () => {
  it('single warning produces correct title, body, icon, and data', () => {
    const result = buildNotificationPayload([
      { name: 'PlayerA', reason: 'Missed War Attack' },
    ]);
    expect(result.title).toBe('WarRoom — Warnings Expired');
    expect(result.body).toBe("PlayerA's Missed War Attack warning has expired.");
    expect(result.icon).toBe('/icon-192.png');
    expect(result.data).toEqual({ url: '/warnings' });
  });

  it('two warnings lists both names', () => {
    const result = buildNotificationPayload([
      { name: 'PlayerA', reason: 'Missed War Attack' },
      { name: 'PlayerB', reason: 'Low Donations' },
    ]);
    expect(result.body).toBe(
      '2 warnings expired: PlayerA (Missed War Attack), PlayerB (Low Donations)',
    );
  });

  it('three or more warnings includes count and all names', () => {
    const result = buildNotificationPayload([
      { name: 'Alpha', reason: 'Behavior' },
      { name: 'Beta', reason: 'Other' },
      { name: 'Gamma', reason: 'Failed Initial Challenge' },
    ]);
    expect(result.body).toBe(
      '3 warnings expired: Alpha (Behavior), Beta (Other), Gamma (Failed Initial Challenge)',
    );
  });
});
