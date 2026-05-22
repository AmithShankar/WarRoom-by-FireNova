import { format } from 'date-fns';
import type { Player } from '@/lib/types';
import { COLUMNS } from './columns';

// ARGB hex colours (ExcelJS format: AARRGGBB)
const H_BG   = 'FF1E293B'; // header background - dark slate
const H_FG   = 'FFFAFAFA'; // header font - near white
const ACCENT = 'FFEF4444'; // brand red - header bottom border
const ZEBRA  = 'FFF8FAFC'; // even-row zebra fill - lightest gray
const BORDER = 'FFE4E4E7'; // cell border colour

export async function buildExcelBuffer(players: Player[]): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WarRoom by FireNova';
  wb.created = new Date();

  const ws = wb.addWorksheet('FireNova Roster', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = COLUMNS.map(col => ({
    header: col.header,
    key: col.header,
    width: col.minWidth ?? 14,
  }));

  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: H_BG } };
    cell.font   = { color: { argb: H_FG }, bold: true, size: 10, name: 'Calibri' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: ACCENT } },
      left:   { style: 'thin',   color: { argb: BORDER } },
      right:  { style: 'thin',   color: { argb: BORDER } },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  players.forEach((p, idx) => {
    const row = ws.addRow(COLUMNS.map(col => col.getValue(p)));
    row.height = 18;

    row.eachCell((cell, colNum) => {
      // Zebra striping on even rows (0-indexed: idx 1, 3, 5 … are even displayed rows)
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
      }
      cell.border = {
        top:    { style: 'thin', color: { argb: BORDER } },
        left:   { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'thin', color: { argb: BORDER } },
        right:  { style: 'thin', color: { argb: BORDER } },
      };
      cell.alignment = { vertical: 'middle' };
      const colDef = COLUMNS[colNum - 1];
      if (colDef?.excelFormat) cell.numFmt = colDef.excelFormat;
    });
  });

  ws.columns.forEach((col, idx) => {
    const colDef = COLUMNS[idx];
    if (!colDef) return;
    const contentLengths = players.map(p => String(colDef.getValue(p)).length);
    const maxLen = Math.max(colDef.header.length, ...contentLengths);
    col.width = Math.min(40, Math.max(colDef.minWidth ?? 12, maxLen + 2));
  });

  const meta = wb.addWorksheet('_meta');
  meta.state = 'hidden';
  meta.addRow(['Export Date',   format(new Date(), 'yyyy-MM-dd HH:mm:ss')]);
  meta.addRow(['App',           'WarRoom by FireNova v1.0']);
  meta.addRow(['Column Count',  COLUMNS.length]);
  meta.addRow(['Row Count',     players.length]);

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

export function getExcelFilename(): string {
  return `players-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
}
