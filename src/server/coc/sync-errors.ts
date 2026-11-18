import { CocApiError } from './client';

/**
 * Short, non-sensitive code stored in SyncLog.message (which sync.status returns publicly).
 * Raw upstream text can include the server's outbound IP (e.g. accessDenied.invalidIp),
 * so the full error is only logged server-side.
 */
export function syncErrorCode(err: unknown): string {
  if (err instanceof CocApiError) {
    if (err.status === 0) return 'config';
    return `coc_${err.status}`;
  }
  if (err instanceof Error && /is not set$/.test(err.message)) return 'config';
  if (err instanceof Error && err.name === 'ZodError') return 'coc_schema';
  return 'unknown';
}
