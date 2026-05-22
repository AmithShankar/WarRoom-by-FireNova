import type { Player, PlayerStatus, Role } from '@/lib/types';
import type { ValidationError } from './types';

export type ColumnDef = {
  header: string;
  getValue: (p: Player) => string | number | boolean;
  parse: (raw: string) => unknown;
  validate: (raw: string) => ValidationError | null;
  applyTo: (parsed: Partial<Player>, value: unknown) => void;
  excelFormat?: string;
  minWidth?: number;
};

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function nearestEnum(raw: string, options: readonly string[]): string | undefined {
  return options
    .map(o => ({ o, d: levenshtein(raw.toLowerCase(), o.toLowerCase()) }))
    .filter(x => x.d <= 2)
    .sort((a, b) => a.d - b.d)[0]?.o;
}

const ROLES = ['Leader', 'Co-Leader', 'Elder', 'Member'] as const;
const STATUSES = ['New', 'Staying', 'Left', 'Kicked', 'Warned'] as const;
const BOOL_MAP: Record<string, boolean> = {
  yes: true, no: false, true: true, false: false, '1': true, '0': false,
};

const TAG_RE = /^#[A-Z0-9]{5,9}$/;

function makeEnumValidator(column: string, options: readonly string[]) {
  return (raw: string): ValidationError | null => {
    if (!raw) return { column, message: `${column} is required` };
    if (options.some(o => o.toLowerCase() === raw.toLowerCase())) return null;
    const suggestion = nearestEnum(raw, options);
    return {
      column,
      message: `"${raw}" is not a valid ${column}`,
      suggestion: suggestion ? `Did you mean "${suggestion}"?` : `Valid: ${options.join(', ')}`,
    };
  };
}

function makeIntValidator(column: string, min: number, max?: number) {
  return (raw: string): ValidationError | null => {
    if (raw === '' || raw === undefined) return null; // optional
    const n = Number(raw);
    if (!Number.isInteger(n) || isNaN(n))
      return { column, message: `"${raw}" is not a whole number` };
    if (n < min)
      return { column, message: `${column} must be ≥ ${min}`, suggestion: `Try ${min}` };
    if (max !== undefined && n > max)
      return { column, message: `${column} must be ≤ ${max}`, suggestion: `Try ${max}` };
    return null;
  };
}

function makeNumberValidator(column: string, min: number, max?: number) {
  return (raw: string): ValidationError | null => {
    if (raw === '' || raw === undefined) return null;
    const n = Number(raw);
    if (isNaN(n)) return { column, message: `"${raw}" is not a number` };
    if (n < min) return { column, message: `${column} must be ≥ ${min}` };
    if (max !== undefined && n > max) return { column, message: `${column} must be ≤ ${max}` };
    return null;
  };
}

export const COLUMNS: ColumnDef[] = [
  {
    header: 'Player Name',
    getValue: p => p.name,
    parse: raw => raw.trim(),
    validate: raw => raw.trim() ? null : { column: 'Player Name', message: 'Player Name is required' },
    applyTo: (parsed, v) => { parsed.name = v as string; },
    minWidth: 16,
  },
  {
    header: 'Player Tag',
    getValue: p => p.playerTag,
    parse: raw => {
      const u = raw.toUpperCase().trim();
      return u.startsWith('#') ? u : `#${u}`;
    },
    validate: (raw): ValidationError | null => {
      if (!raw.trim()) return { column: 'Player Tag', message: 'Player Tag is required' };
      const u = raw.toUpperCase().trim();
      const normalized = u.startsWith('#') ? u : `#${u}`;
      if (TAG_RE.test(normalized)) {
        if (!u.startsWith('#'))
          return { column: 'Player Tag', message: `Missing # prefix`, suggestion: `Try ${normalized}` };
        return null;
      }
      return { column: 'Player Tag', message: `"${raw}" is not a valid CoC tag (e.g. #ABC12)` };
    },
    applyTo: (parsed, v) => { parsed.playerTag = v as string; },
    minWidth: 14,
  },
  {
    header: 'Town Hall Level',
    getValue: p => p.townHallLevel,
    parse: raw => Number(raw),
    validate: (raw): ValidationError | null => {
      if (!raw.trim()) return { column: 'Town Hall Level', message: 'Town Hall Level is required' };
      const n = Number(raw);
      if (!Number.isInteger(n) || isNaN(n))
        return { column: 'Town Hall Level', message: `"${raw}" is not a whole number` };
      if (n < 1 || n > 16)
        return { column: 'Town Hall Level', message: `Must be 1–16, got ${n}`, suggestion: `Try ${Math.min(16, Math.max(1, n))}` };
      return null;
    },
    applyTo: (parsed, v) => { parsed.townHallLevel = v as number; },
    excelFormat: '0',
    minWidth: 16,
  },
  {
    header: 'Role',
    getValue: p => p.role,
    parse: raw => ROLES.find(r => r.toLowerCase() === raw.toLowerCase()) ?? raw,
    validate: makeEnumValidator('Role', ROLES),
    applyTo: (parsed, v) => { parsed.role = v as Role; },
    minWidth: 12,
  },
  {
    header: 'Status',
    getValue: p => p.status,
    parse: raw => STATUSES.find(s => s.toLowerCase() === raw.toLowerCase()) ?? raw,
    validate: makeEnumValidator('Status', STATUSES),
    applyTo: (parsed, v) => { parsed.status = v as PlayerStatus; },
    minWidth: 12,
  },
  {
    header: 'Challenge Posted',
    getValue: p => p.postedChallenge ? 'Yes' : 'No',
    parse: raw => BOOL_MAP[raw.toLowerCase()],
    validate: (raw): ValidationError | null => {
      if (!raw.trim()) return { column: 'Challenge Posted', message: 'Challenge Posted is required' };
      if (raw.toLowerCase() in BOOL_MAP) return null;
      return { column: 'Challenge Posted', message: `"${raw}" is not valid`, suggestion: 'Use Yes or No' };
    },
    applyTo: (parsed, v) => { parsed.postedChallenge = v as boolean; },
    minWidth: 18,
  },
  {
    header: 'CWL Stars',
    getValue: p => p.cwlStats.stars,
    parse: raw => raw ? Number(raw) : 0,
    validate: makeIntValidator('CWL Stars', 0),
    applyTo: (parsed, v) => {
      if (!parsed.cwlStats) parsed.cwlStats = { stars: 0, destructionPercentage: 0, attacksUsed: 0 };
      parsed.cwlStats.stars = v as number;
    },
    excelFormat: '0',
    minWidth: 12,
  },
  {
    header: 'Destruction %',
    getValue: p => p.cwlStats.destructionPercentage,
    parse: raw => raw ? Number(raw) : 0,
    validate: makeNumberValidator('Destruction %', 0, 100),
    applyTo: (parsed, v) => {
      if (!parsed.cwlStats) parsed.cwlStats = { stars: 0, destructionPercentage: 0, attacksUsed: 0 };
      parsed.cwlStats.destructionPercentage = v as number;
    },
    excelFormat: '0.00"%"',
    minWidth: 16,
  },
  {
    header: 'Attacks Used',
    getValue: p => p.cwlStats.attacksUsed,
    parse: raw => raw ? Number(raw) : 0,
    validate: makeIntValidator('Attacks Used', 0),
    applyTo: (parsed, v) => {
      if (!parsed.cwlStats) parsed.cwlStats = { stars: 0, destructionPercentage: 0, attacksUsed: 0 };
      parsed.cwlStats.attacksUsed = v as number;
    },
    excelFormat: '0',
    minWidth: 14,
  },
];
