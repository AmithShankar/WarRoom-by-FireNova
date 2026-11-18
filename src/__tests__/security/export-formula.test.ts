import { describe, expect, it } from 'vitest';
import { buildCsvBlob } from '@/lib/import-export/csv-export';
import { buildExcelBuffer } from '@/lib/import-export/excel-export';
import { neutralizeFormula } from '@/lib/import-export/formula';
import type { Player } from '@/lib/types';

function player(name: string): Player {
  return {
    playerTag: '#FN001', name, townHallLevel: 16, role: 'Member', status: 'Staying', postedChallenge: false,
    cwlStats: { stars: 0, destructionPercentage: 0, attacksUsed: 0 },
    joinedAt: '', donations: 0, donationsReceived: 0, warStars: 0, notes: '',
    troops: { army: '', spells: '', cc: '', comfortBases: [] },
    warPerformance: { totalAttacks: 0, threeStarRate: 0, averageDestruction: 0, missedAttacks: 0 },
    warnings: [], recentActivity: [],
  };
}

describe('neutralizeFormula (L6)', () => {
  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx'])('prefixes %j with a single quote', v => {
    expect(neutralizeFormula(v)).toBe(`'${v}`);
  });
  it('leaves ordinary text alone', () => {
    expect(neutralizeFormula('Bob')).toBe('Bob');
    expect(neutralizeFormula('a=b')).toBe('a=b');
  });
});

describe('CSV export (L6)', () => {
  it('neutralizes a formula in a player name and still quotes it', async () => {
    const text = await buildCsvBlob([player('=HYPERLINK("http://x","click")')]).text();
    expect(text).toContain(`"'=HYPERLINK(""http://x"",""click"")"`);
  });
  it.each(['+cmd', '-2+3', '@SUM(1)', '\tTab'])('neutralizes %j', async name => {
    const row = (await buildCsvBlob([player(name)]).text()).split('\r\n')[1];
    expect(row.startsWith(`'${name}`) || row.startsWith(`"'${name}`)).toBe(true);
  });
  it('does not touch numeric cells', async () => {
    const row = (await buildCsvBlob([player('Bob')]).text()).split('\r\n')[1];
    expect(row).toContain(',16,');
  });
});

describe('Excel export (L6)', () => {
  it('neutralizes a formula in a player name cell', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const buf = await buildExcelBuffer([player('=HYPERLINK("http://x")')]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const values = wb.getWorksheet('FireNova Roster')!.getRow(2).values as unknown[];
    expect(values).toContain(`'=HYPERLINK("http://x")`);
  }, 60_000);
});
