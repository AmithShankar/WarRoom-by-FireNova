/**
 * Spreadsheet formula-injection guard (L6). Player names come from Clash of Clans, so any member
 * can choose a name such as =HYPERLINK(...). A cell starting with = + - @ tab or CR is read as a
 * formula by Excel / Sheets / LibreOffice; prefixing a single quote makes it plain text.
 * Only applied to strings, so numeric cells (including negative numbers) are left alone.
 */
export function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function neutralizeCell<T>(value: T): T | string {
  return typeof value === 'string' ? neutralizeFormula(value) : value;
}
