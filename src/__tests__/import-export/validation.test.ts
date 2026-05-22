// src/__tests__/import-export/validation.test.ts
import { validateAndParse } from '@/lib/import-export/validation';

const VALID_RAW = {
  'Player Name': 'Apex',
  'Player Tag': '#FN001',
  'Town Hall Level': '16',
  'Role': 'Co-Leader',
  'Status': 'Staying',
  'Challenge Posted': 'Yes',
  'CWL Stars': '16',
  'Destruction %': '94.5',
  'Attacks Used': '7',
};

describe('validateAndParse', () => {
  it('returns no errors for a fully valid row', () => {
    const { errors } = validateAndParse(VALID_RAW, 2);
    expect(errors).toHaveLength(0);
  });

  it('parses all fields correctly for a valid row', () => {
    const { parsed } = validateAndParse(VALID_RAW, 2);
    expect(parsed.name).toBe('Apex');
    expect(parsed.playerTag).toBe('#FN001');
    expect(parsed.townHallLevel).toBe(16);
    expect(parsed.role).toBe('Co-Leader');
    expect(parsed.status).toBe('Staying');
    expect(parsed.postedChallenge).toBe(true);
    expect(parsed.cwlStats?.stars).toBe(16);
    expect(parsed.cwlStats?.destructionPercentage).toBe(94.5);
    expect(parsed.cwlStats?.attacksUsed).toBe(7);
  });

  it('errors on missing player name', () => {
    const { errors } = validateAndParse({ ...VALID_RAW, 'Player Name': '' }, 2);
    expect(errors.some(e => e.column === 'Player Name')).toBe(true);
  });

  it('errors on tag without # and provides suggestion', () => {
    const { errors } = validateAndParse({ ...VALID_RAW, 'Player Tag': 'FN001AB' }, 2);
    const err = errors.find(e => e.column === 'Player Tag');
    expect(err).toBeDefined();
    expect(err?.suggestion).toContain('#FN001AB');
  });

  it('errors on town hall level out of range', () => {
    const { errors } = validateAndParse({ ...VALID_RAW, 'Town Hall Level': '17' }, 2);
    const err = errors.find(e => e.column === 'Town Hall Level');
    expect(err).toBeDefined();
    expect(err?.suggestion).toBe('Try 16');
  });

  it('errors on invalid role and suggests nearest match', () => {
    const { errors } = validateAndParse({ ...VALID_RAW, 'Role': 'co-leder' }, 2);
    const err = errors.find(e => e.column === 'Role');
    expect(err).toBeDefined();
    expect(err?.suggestion).toContain('Co-Leader');
  });

  it('accepts all boolean variants', () => {
    for (const val of ['Yes', 'No', 'TRUE', 'FALSE', '1', '0']) {
      const { errors } = validateAndParse({ ...VALID_RAW, 'Challenge Posted': val }, 2);
      expect(errors.filter(e => e.column === 'Challenge Posted')).toHaveLength(0);
    }
  });

  it('accepts empty CWL fields (optional)', () => {
    const { errors } = validateAndParse(
      { ...VALID_RAW, 'CWL Stars': '', 'Destruction %': '', 'Attacks Used': '' }, 2,
    );
    expect(errors.filter(e => ['CWL Stars','Destruction %','Attacks Used'].includes(e.column))).toHaveLength(0);
  });

  it('is case-insensitive for headers', () => {
    const lowerKeys: Record<string, string> = {};
    for (const [k, v] of Object.entries(VALID_RAW)) lowerKeys[k.toLowerCase()] = v;
    const { errors } = validateAndParse(lowerKeys, 2);
    expect(errors).toHaveLength(0);
  });
});
