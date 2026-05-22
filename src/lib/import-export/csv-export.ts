// src/lib/import-export/csv-export.ts
import { format } from 'date-fns';
import type { Player } from '@/lib/types';
import { COLUMNS } from './columns';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsvBlob(players: Player[]): Blob {
  const header = COLUMNS.map(c => c.header).join(',');
  const rows = players.map(p =>
    COLUMNS.map(c => escapeCsv(String(c.getValue(p)))).join(','),
  );
  const content = [header, ...rows].join('\r\n');
  return new Blob([content], { type: 'text/csv;charset=utf-8;' });
}

export function getCsvFilename(): string {
  return `players-${format(new Date(), 'yyyy-MM-dd')}.csv`;
}
