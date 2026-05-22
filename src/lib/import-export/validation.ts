// src/lib/import-export/validation.ts
import type { Player } from '@/lib/types';
import type { ImportRow, ValidationError } from './types';
import { COLUMNS } from './columns';

export function validateAndParse(
  raw: Record<string, string>,
  rowNumber: number,
): Pick<ImportRow, 'rowNumber' | 'raw' | 'parsed' | 'errors'> {
  // Normalize header keys: trim + lowercase for case-insensitive matching
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    normalized[k.trim().toLowerCase()] = (v ?? '').toString().trim();
  }

  const errors: ValidationError[] = [];
  const parsed: Partial<Player> = {};

  for (const col of COLUMNS) {
    const rawValue = normalized[col.header.toLowerCase()] ?? '';
    const err = col.validate(rawValue);
    if (err) {
      errors.push(err);
    } else {
      try {
        const value = col.parse(rawValue);
        col.applyTo(parsed, value);
      } catch (e) {
        errors.push({ column: col.header, message: `Parse error: ${String(e)}` });
      }
    }
  }

  return { rowNumber, raw, parsed, errors };
}
