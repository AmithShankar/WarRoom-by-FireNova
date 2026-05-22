// src/__tests__/import-export/csv-export.test.ts
import { buildCsvBlob, getCsvFilename } from '@/lib/import-export/csv-export';
import type { Player } from '@/lib/types';

const PLAYER: Player = {
  playerTag: '#FN001',
  name: 'Test, "Player"',   // comma + quote to test escaping
  townHallLevel: 16,
  role: 'Leader',
  status: 'Staying',
  postedChallenge: false,
  cwlStats: { stars: 14, destructionPercentage: 87.5, attacksUsed: 7 },
  joinedAt: '', donations: 0, donationsReceived: 0, warStars: 0, notes: '',
  troops: { army: '', spells: '', cc: '', comfortBases: [] },
  warPerformance: { totalAttacks: 0, threeStarRate: 0, averageDestruction: 0, missedAttacks: 0 },
  warnings: [], recentActivity: [],
};

describe('buildCsvBlob', () => {
  it('first line is the correct header', async () => {
    const blob = buildCsvBlob([PLAYER]);
    const text = await blob.text();
    const [header] = text.split(/\r?\n/);
    expect(header).toBe(
      'Player Name,Player Tag,Town Hall Level,Role,Status,Challenge Posted,CWL Stars,Destruction %,Attacks Used',
    );
  });

  it('boolean false exports as No', async () => {
    const blob = buildCsvBlob([PLAYER]);
    const text = await blob.text();
    expect(text).toContain('No');
  });

  it('escapes commas and quotes in player name', async () => {
    const blob = buildCsvBlob([PLAYER]);
    const text = await blob.text();
    // name contains comma and quote - must be double-quoted
    expect(text).toContain('"Test, ""Player"""');
  });

  it('produces correct row count', async () => {
    const blob = buildCsvBlob([PLAYER, PLAYER]);
    const text = await blob.text();
    const lines = text.trim().split(/\r?\n/);
    expect(lines).toHaveLength(3); // 1 header + 2 data
  });

  it('getCsvFilename matches date pattern', () => {
    expect(getCsvFilename()).toMatch(/^players-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
