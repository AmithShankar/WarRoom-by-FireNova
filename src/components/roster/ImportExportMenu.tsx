'use client';

import { useCallback, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImportModal } from './ImportModal';
import type { DuplicateMode, ImportResult, ImportRow } from '@/lib/import-export/types';
import type { Player } from '@/lib/types';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ImportExportMenuProps {
  players: Player[];
  onImport: (rows: ImportRow[], mode: DuplicateMode) => ImportResult;
}

export function ImportExportMenu({ players, onImport }: ImportExportMenuProps) {
  const [importFormat, setImportFormat] = useState<'csv' | 'xlsx' | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  const handleExportCsv = useCallback(async () => {
    setExporting('csv');
    try {
      const { buildCsvBlob, getCsvFilename } = await import('@/lib/import-export/csv-export');
      const blob = buildCsvBlob(players);
      const name = getCsvFilename();
      triggerDownload(blob, name);
      toast.success(`${name} downloaded`);
    } catch {
      toast.error('CSV export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  }, [players]);

  const handleExportExcel = useCallback(async () => {
    setExporting('xlsx');
    try {
      const { buildExcelBuffer, getExcelFilename } = await import('@/lib/import-export/excel-export');
      const buffer = await buildExcelBuffer(players);
      const blob = new Blob(
        [buffer],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      );
      const name = getExcelFilename();
      triggerDownload(blob, name);
      toast.success(`${name} downloaded`);
    } catch {
      toast.error('Excel export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  }, [players]);

  return (
    <>
      {/* Export dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="subtle" disabled={exporting !== null} aria-label="Export players">
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export'}
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleExportCsv} disabled={exporting === 'csv'}>
            <FileText className="mr-2 h-4 w-4 text-text-3" />
            Export CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportExcel} disabled={exporting === 'xlsx'}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-text-3" />
            Export Excel (.xlsx)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Import dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="subtle" aria-label="Import players">
            <Upload className="h-4 w-4" />
            Import
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setImportFormat('csv')}>
            <FileText className="mr-2 h-4 w-4 text-text-3" />
            Import CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setImportFormat('xlsx')}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-text-3" />
            Import Excel (.xlsx)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              try {
                const { getSampleCsvBlob } = await import('@/lib/import-export/template');
                triggerDownload(getSampleCsvBlob(), 'players-template.csv');
              } catch { toast.error('Template download failed'); }
            }}
          >
            Download CSV template
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              try {
                const { getSampleExcelBuffer } = await import('@/lib/import-export/template');
                const buf = await getSampleExcelBuffer();
                const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                triggerDownload(blob, 'players-template.xlsx');
              } catch { toast.error('Template download failed'); }
            }}
          >
            Download Excel template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Import modal (lazy-mounted) */}
      {importFormat && (
        <ImportModal
          open
          onOpenChange={open => { if (!open) setImportFormat(null); }}
          acceptFormat={importFormat}
          existingPlayers={players}
          onImport={onImport}
        />
      )}
    </>
  );
}
