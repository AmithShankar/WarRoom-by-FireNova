import { describe, it, expect } from 'vitest';

// Mirrors the WarningSheet submit guard: duration required iff Failed Initial Challenge.
function canSubmit(reason: string, duration: number | null): boolean {
  if (reason === 'Failed Initial Challenge' && duration == null) return false;
  return true;
}

describe('warning duration validation', () => {
  it('blocks Failed Initial Challenge with no duration', () => {
    expect(canSubmit('Failed Initial Challenge', null)).toBe(false);
  });
  it('allows Failed Initial Challenge with a duration', () => {
    expect(canSubmit('Failed Initial Challenge', 48)).toBe(true);
  });
  it('allows other reasons with no duration', () => {
    expect(canSubmit('Behavior', null)).toBe(true);
    expect(canSubmit('Low Donations', null)).toBe(true);
  });
});
