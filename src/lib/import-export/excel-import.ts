import type { ImportRow } from './types';
import { validateAndParse } from './validation';

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    // RichText: { richText: [{text:'...'}] }
    if ('richText' in (v as object)) {
      return ((v as { richText: { text: string }[] }).richText ?? []).map(r => r.text).join('');
    }
    // Formula result: { result: value }
    if ('result' in (v as object)) return cellToString((v as { result: unknown }).result);
    if (v instanceof Date) return v.toISOString();
  }
  return String(v).trim();
}

export async function parseExcel(file: File, existingTags: Set<string>): Promise<ImportRow[]> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  // Use first non-_meta worksheet
  const ws = wb.worksheets.find(s => s.name !== '_meta');
  if (!ws) throw new Error('No worksheet found in the uploaded file.');

  const rows: ImportRow[] = [];
  let headers: string[] = [];

  ws.eachRow((row, rowNumber) => {
    // ExcelJS row.values is 1-indexed; index 0 is always null
    const cells = (row.values as unknown[]).slice(1).map(cellToString);

    if (rowNumber === 1) {
      headers = cells;
      return;
    }

    const raw: Record<string, string> = {};
    headers.forEach((h, i) => { raw[h] = cells[i] ?? ''; });

    const base = validateAndParse(raw, rowNumber);
    const isDuplicate = !!base.parsed.playerTag && existingTags.has(base.parsed.playerTag);
    rows.push({ ...base, isDuplicate });
  });

  return rows;
}
