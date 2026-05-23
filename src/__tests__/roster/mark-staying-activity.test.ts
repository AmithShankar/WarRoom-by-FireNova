import { describe, it, expect } from 'vitest';
import { ACTIVITY_LABELS, canMarkStayingByActivity } from '@/server/routers/roster';

describe('canMarkStayingByActivity — eligibility', () => {
  it('allows New status', () => {
    expect(canMarkStayingByActivity('New')).toBe(true);
  });
  it('allows Warned status', () => {
    expect(canMarkStayingByActivity('Warned')).toBe(true);
  });
  it('rejects Staying status', () => {
    expect(canMarkStayingByActivity('Staying')).toBe(false);
  });
  it('rejects Kicked status', () => {
    expect(canMarkStayingByActivity('Kicked')).toBe(false);
  });
  it('rejects Left status', () => {
    expect(canMarkStayingByActivity('Left')).toBe(false);
  });
});

describe('ACTIVITY_LABELS — label map', () => {
  it('maps ClanGames correctly', () => {
    expect(ACTIVITY_LABELS.ClanGames).toBe('Clan Games');
  });
  it('maps CWL correctly', () => {
    expect(ACTIVITY_LABELS.CWL).toBe('CWL Participation');
  });
  it('maps RaidWeekend correctly', () => {
    expect(ACTIVITY_LABELS.RaidWeekend).toBe('Raid Weekend');
  });
  it('maps Other correctly', () => {
    expect(ACTIVITY_LABELS.Other).toBe('Other');
  });
  it('produces the correct activity log summary for ClanGames', () => {
    expect(`Marked staying — ${ACTIVITY_LABELS.ClanGames}`).toBe('Marked staying — Clan Games');
  });
});
