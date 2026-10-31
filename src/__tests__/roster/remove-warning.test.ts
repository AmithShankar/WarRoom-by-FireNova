import { describe, it, expect } from 'vitest';
import { statusAfterWarningRemoved } from '@/server/routers/roster';

describe('statusAfterWarningRemoved', () => {
  it('returns Staying when the last warning is removed and the challenge was posted', () => {
    expect(statusAfterWarningRemoved('Warned', 0, true)).toBe('Staying');
  });
  it('returns New when the last warning is removed and the challenge was not posted', () => {
    expect(statusAfterWarningRemoved('Warned', 0, false)).toBe('New');
  });
  it('stays Warned while other warnings remain', () => {
    expect(statusAfterWarningRemoved('Warned', 1, true)).toBe('Warned');
  });
  it('never changes a status that is not Warned', () => {
    expect(statusAfterWarningRemoved('Kicked', 0, true)).toBe('Kicked');
    expect(statusAfterWarningRemoved('Staying', 0, true)).toBe('Staying');
  });
});
