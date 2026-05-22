// src/components/roster/ImportSummary.tsx
'use client';

import { memo } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ImportResult } from '@/lib/import-export/types';

interface ImportSummaryProps {
  result: ImportResult;
  onDownloadErrors: () => void;
  onClose: () => void;
}

export const ImportSummary = memo(function ImportSummary({
  result, onDownloadErrors, onClose,
}: ImportSummaryProps) {
  const success = result.imported > 0 || result.updated > 0;

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className={cn(
        'flex items-center gap-3 rounded-xl p-4',
        success ? 'bg-emerald-500/10' : 'bg-red-500/10',
      )}>
        {success
          ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          : <XCircle className="h-5 w-5 shrink-0 text-red-500" />}
        <p className={cn('font-medium text-sm', success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
          {success ? 'Import complete' : 'Import failed: no rows were imported'}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total rows"          value={result.total}    />
        <Stat label="Imported"            value={result.imported} accent="green" />
        <Stat label="Updated"             value={result.updated}  accent={result.updated > 0 ? 'green' : undefined} />
        <Stat label="Duplicates skipped"  value={result.skipped}  />
        <Stat label="Validation failures" value={result.failed}   accent={result.failed > 0 ? 'red' : undefined} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1">
        {result.failed > 0 && (
          <Button variant="subtle" onClick={onDownloadErrors} className="w-full gap-2">
            Download error report (.csv)
          </Button>
        )}
        <Button onClick={onClose} className="w-full">Close</Button>
      </div>
    </div>
  );
});

function Stat({ label, value, accent }: {
  label: string; value: number; accent?: 'green' | 'red';
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-1 bg-surface-2 px-3 py-2.5">
      <p className={cn(
        'text-xl font-bold leading-none',
        accent === 'green' && value > 0 ? 'text-emerald-500' :
        accent === 'red'   && value > 0 ? 'text-red-500'     : 'text-text-1',
      )}>
        {value}
      </p>
      <p className="text-xs text-text-2">{label}</p>
    </div>
  );
}
