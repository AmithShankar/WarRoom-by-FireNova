// src/components/roster/ImportPreviewTable.tsx
'use client';

import { memo } from 'react';
import { AlertCircle, ChevronsRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLUMNS } from '@/lib/import-export/columns';
import type { ImportRow } from '@/lib/import-export/types';

const MAX_ROWS = 500;

interface ImportPreviewTableProps {
  rows: ImportRow[];
}

export const ImportPreviewTable = memo(function ImportPreviewTable({ rows }: ImportPreviewTableProps) {
  const display = rows.slice(0, MAX_ROWS);
  const truncated = rows.length > MAX_ROWS;

  return (
    <div className="space-y-1.5">
      {truncated && (
        <p className="text-[11px] text-text-3">
          Showing first {MAX_ROWS} of {rows.length.toLocaleString()} rows. All rows are validated and will be processed on import.
        </p>
      )}
      <div className="max-h-72 overflow-auto rounded-lg border border-border-1">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-surface-1/95 backdrop-blur">
            <tr className="border-b border-border-1">
              <th className="w-8 px-2 py-2 text-left font-medium text-text-3">#</th>
              <th className="w-5 px-1 py-2" />
              {COLUMNS.map(c => (
                <th key={c.header} className="whitespace-nowrap px-2 py-2 text-left font-medium text-text-3">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map(row => {
              const hasError = row.errors.length > 0;
              const isDup = row.isDuplicate && !hasError;
              const tooltip = hasError
                ? row.errors.map(e => `${e.column}: ${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`).join('\n')
                : isDup
                ? 'Duplicate: player tag already exists in the roster'
                : undefined;

              return (
                <tr
                  key={row.rowNumber}
                  className={cn(
                    'border-b border-border-1/40',
                    hasError && 'border-l-2 border-l-red-500 bg-red-500/5',
                    isDup    && 'border-l-2 border-l-amber-500 bg-amber-500/5',
                  )}
                >
                  <td className="px-2 py-1.5 font-mono text-text-3">{row.rowNumber}</td>
                  <td className="px-1 py-1.5">
                    {hasError && (
                      <span title={tooltip} className="cursor-help">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      </span>
                    )}
                    {isDup && (
                      <span title={tooltip} className="cursor-help">
                        <ChevronsRightLeft className="h-3.5 w-3.5 text-amber-500" />
                      </span>
                    )}
                  </td>
                  {COLUMNS.map(col => {
                    const colError = row.errors.find(e => e.column === col.header);
                    const rawVal = row.raw[col.header] ?? row.raw[col.header.toLowerCase()] ?? '';
                    return (
                      <td
                        key={col.header}
                        title={colError ? `${colError.message}${colError.suggestion ? `: ${colError.suggestion}` : ''}` : undefined}
                        className={cn(
                          'max-w-[100px] truncate px-2 py-1.5',
                          colError ? 'text-red-500' : 'text-text-2',
                        )}
                      >
                        {rawVal}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {display.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="px-4 py-6 text-center text-xs text-text-3">
                  No rows parsed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
