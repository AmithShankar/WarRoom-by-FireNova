import type { Player } from '@/lib/types';

/** One parsed row from an import file. */
export type ImportRow = {
  rowNumber: number;              // 1-based (matching file row, header = row 1)
  raw: Record<string, string>;   // raw string values keyed by header
  parsed: Partial<Player>;       // successfully parsed fields
  errors: ValidationError[];     // per-field validation failures
  isDuplicate: boolean;          // playerTag already exists in the store
};

/** A validation failure for one column in one row. */
export type ValidationError = {
  column: string;       // human-readable column header
  message: string;      // concise error description
  suggestion?: string;  // optional auto-fix hint shown in UI
};

/** Summary returned by importPlayers() after applying an import. */
export type ImportResult = {
  total: number;          // all data rows in the file (excl. header)
  imported: number;       // new players added
  updated: number;        // existing players updated
  skipped: number;        // duplicates skipped (mode = skip)
  failed: number;         // rows with validation errors not imported
  errorRows: ImportRow[]; // the failed rows, used for error report download
};

/** How to handle rows whose playerTag already exists in the store. */
export type DuplicateMode = 'skip' | 'update' | 'merge';
