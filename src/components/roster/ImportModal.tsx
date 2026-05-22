'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportDropzone } from './ImportDropzone';
import { ImportPreviewTable } from './ImportPreviewTable';
import { ImportSummary } from './ImportSummary';
import type { DuplicateMode, ImportResult, ImportRow } from '@/lib/import-export/types';
import type { Player } from '@/lib/types';

type Step = 'upload' | 'preview' | 'summary';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acceptFormat: 'csv' | 'xlsx';
  existingPlayers: Player[];
  onImport: (rows: ImportRow[], mode: DuplicateMode) => ImportResult;
}

export function ImportModal({
  open, onOpenChange, acceptFormat, existingPlayers, onImport,
}: ImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [mode, setMode] = useState<DuplicateMode>('skip');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const validCount = rows.filter(r => r.errors.length === 0 && !r.isDuplicate).length +
    (mode !== 'skip' ? rows.filter(r => r.errors.length === 0 && r.isDuplicate).length : 0);
  const errorCount = rows.filter(r => r.errors.length > 0).length;
  const dupCount   = rows.filter(r => r.errors.length === 0 && r.isDuplicate).length;

  const handleFile = useCallback(async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    try {
      const existingTags = new Set(existingPlayers.map(p => p.playerTag));
      const ext = file.name.split('.').pop()?.toLowerCase();
      let parsed: ImportRow[];
      if (ext === 'csv') {
        const { parseCsv } = await import('@/lib/import-export/csv-import');
        parsed = await parseCsv(file, existingTags);
      } else if (ext === 'xlsx') {
        const { parseExcel } = await import('@/lib/import-export/excel-import');
        parsed = await parseExcel(file, existingTags);
      } else {
        throw new Error(`Unsupported file type ".${ext}". Use .csv or .xlsx.`);
      }
      setRows(parsed);
      setStep('preview');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsParsing(false);
    }
  }, [existingPlayers]);

  const handleConfirmImport = useCallback(() => {
    const importResult = onImport(rows, mode);
    setResult(importResult);
    setStep('summary');
    if (importResult.imported > 0 || importResult.updated > 0) {
      toast.success(
        `${importResult.imported} imported, ${importResult.updated} updated`,
        { description: importResult.failed > 0 ? `${importResult.failed} rows failed validation` : undefined },
      );
    }
  }, [rows, mode, onImport]);

  const handleDownloadErrors = useCallback(() => {
    if (!result) return;
    const headers = ['Row', 'Player Name', 'Player Tag', 'Error Column', 'Error Message', 'Suggestion'];
    const lines = result.errorRows.flatMap(row =>
      row.errors.map(e => [
        row.rowNumber,
        row.raw['Player Name'] ?? '',
        row.raw['Player Tag'] ?? '',
        e.column,
        e.message,
        e.suggestion ?? '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('upload');
      setRows([]);
      setResult(null);
      setParseError(null);
    }, 300);
  }, [onOpenChange]);

  const title = step === 'upload'
    ? `Import ${acceptFormat.toUpperCase()}`
    : step === 'preview' ? 'Preview Import'
    : 'Import Complete';

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Step 1: Upload ─────────────────────────────────────── */}
          {step === 'upload' && (
            <>
              <ImportDropzone
                accept={`.${acceptFormat}` as '.csv' | '.xlsx'}
                onFile={handleFile}
                disabled={isParsing}
              />
              {isParsing && (
                <p className="animate-pulse text-center text-sm text-text-2">Parsing file…</p>
              )}
              {parseError && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{parseError}</p>
              )}
              <div className="flex items-center justify-between rounded-lg border border-border-1 bg-surface-2 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-1">Duplicate handling</p>
                  <p className="text-xs text-text-3">What to do when player tag already exists</p>
                </div>
                <Select value={mode} onValueChange={v => setMode(v as DuplicateMode)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="merge">Merge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="subtle"
                className="w-full gap-2 text-text-2"
                onClick={async () => {
                  const { getSampleCsvBlob, getSampleExcelBuffer } = await import('@/lib/import-export/template');
                  if (acceptFormat === 'csv') {
                    const blob = getSampleCsvBlob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'players-template.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } else {
                    const buf = await getSampleExcelBuffer();
                    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'players-template.xlsx'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }
                }}
              >
                Download sample template
              </Button>
            </>
          )}

          {/* ── Step 2: Preview ────────────────────────────────────── */}
          {step === 'preview' && (
            <>
              <div className="flex flex-wrap gap-4 text-sm font-medium">
                <span className="text-emerald-500">✓ {rows.filter(r => r.errors.length === 0).length} valid</span>
                {errorCount > 0 && <span className="text-red-500">✗ {errorCount} errors</span>}
                {dupCount   > 0 && <span className="text-amber-500">≅ {dupCount} duplicates</span>}
              </div>
              <ImportPreviewTable rows={rows} />
            </>
          )}

          {/* ── Step 3: Summary ────────────────────────────────────── */}
          {step === 'summary' && result && (
            <ImportSummary
              result={result}
              onDownloadErrors={handleDownloadErrors}
              onClose={handleClose}
            />
          )}
        </div>

        {step === 'preview' && (
          <SheetFooter>
            <Button variant="subtle" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleConfirmImport} disabled={validCount === 0}>
              Import {validCount} row{validCount !== 1 ? 's' : ''}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
