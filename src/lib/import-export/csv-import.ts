// src/lib/import-export/csv-import.ts
import type { ImportRow } from './types';
import { validateAndParse } from './validation';

export async function parseCsv(file: File, existingTags: Set<string>): Promise<ImportRow[]> {
  const Papa = (await import('papaparse')).default;

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (results) => {
        const rows: ImportRow[] = results.data.map((raw, i) => {
          const base = validateAndParse(raw, i + 2); // row 1 = header, data starts at 2
          const isDuplicate = !!base.parsed.playerTag && existingTags.has(base.parsed.playerTag);
          return { ...base, isDuplicate };
        });
        resolve(rows);
      },
      error: (err: Error) => reject(new Error(`CSV parse error: ${err.message}`)),
    });
  });
}
