// src/components/roster/ImportDropzone.tsx
'use client';

import { useCallback, useRef, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportDropzoneProps {
  accept: '.csv' | '.xlsx';
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function ImportDropzone({ accept, onFile, disabled }: ImportDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (ext !== accept) return;
      onFile(file);
    },
    [accept, onFile, disabled],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Upload ${accept} file`}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={e => !disabled && (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={cn(
        'flex cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors',
        isDragging
          ? 'border-brand-from bg-brand-from/5'
          : 'border-border-1 hover:border-border-strong hover:bg-surface-2',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-3 text-text-2">
        <FileSpreadsheet className="h-6 w-6" />
      </div>
      <div>
        <p className="font-medium text-text-1">Drop your {accept} file here</p>
        <p className="mt-0.5 text-sm text-text-2">
          or{' '}
          <span className="text-brand-from underline-offset-2 hover:underline">browse files</span>
        </p>
        <p className="mt-1 text-xs text-text-3">Accepts {accept}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-hidden
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
