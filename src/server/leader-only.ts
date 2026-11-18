/**
 * Leader-only data policy (M3, M4).
 *
 * Every read procedure that returns player, warning, participation or activity rows passes its
 * result through stripLeaderOnlyFields(result, ctx.isLeader) (see viewerProcedure in trpc.ts).
 *
 * Leader-only:
 *  - leader-entered free text: Player.notes, Player.kickReason, Warning.notes,
 *    WarParticipation.excuseReason, and the `detail` of activity rows (e.g. a kick reason)
 *  - who made a change: the `editorName` of activity rows
 *
 * Visitors get the same shape with the free text blanked ('' or null), so client types and
 * components stay unchanged. The raw editorName / detail columns, and Player.sessionVersion (it
 * would show how often each leader signs out), are never sent to anyone:
 * leaders get them folded into `summary` ("<summary>: <detail> by <editor>"), the format the
 * UI showed before these columns existed.
 */

const BLANKED: Record<string, '' | null> = {
  notes: '',
  kickReason: null,
  excuseReason: null,
};

// Never sent to any client.
const ALWAYS_DROPPED = new Set(['editorName', 'detail', 'sessionVersion']);

type Redacted<T> = T extends Date
  ? T
  : T extends (infer U)[]
    ? Redacted<U>[]
    : T extends object
      ? { [K in keyof T as K extends 'editorName' | 'detail' | 'sessionVersion' ? never : K]: Redacted<T[K]> }
      : T;

/**
 * Rows written before editorName/detail existed have the editor and any reason inside the
 * summary text. For visitors, cut them off:
 *  - kick summaries: everything after "removed from clan" / "was kicked" (the reason, then "by X")
 *  - everything from the last " by " / " (by " / " (reclassified by " onwards
 * Greedy matching takes the last " by ", so a ")" or " by " inside a reason no longer defeats it.
 */
export function stripLegacyLeaderText(summary: string): string {
  const kick = summary.match(/^([\s\S]*?(?:removed from clan|Removed from clan|was kicked))(?::|\s+by\s|\s+\(by\s)[\s\S]*$/);
  if (kick) return kick[1];
  const attributed = summary.match(/^([\s\S]*\S)\s+(?:\(reclassified by|\(by|by)\s+[\s\S]+$/);
  return attributed ? attributed[1] : summary;
}

type ActivityLike = { summary: string; editorName?: string | null; detail?: string | null };

function presentSummary(row: ActivityLike, isLeader: boolean): string {
  const hasColumns = (row.editorName ?? null) !== null || (row.detail ?? null) !== null;
  if (!isLeader) return hasColumns ? row.summary : stripLegacyLeaderText(row.summary);
  const detail = row.detail ? `: ${row.detail}` : '';
  const by = row.editorName ? ` by ${row.editorName}` : '';
  return `${row.summary}${detail}${by}`;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

export function stripLeaderOnlyFields<T>(value: T, isLeader: boolean): Redacted<T> {
  if (Array.isArray(value)) return value.map(v => stripLeaderOnlyFields(v, isLeader)) as Redacted<T>;
  if (!isPlainObject(value)) return value as Redacted<T>;

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (ALWAYS_DROPPED.has(key)) continue;
    if (!isLeader && key in BLANKED && v !== null && v !== undefined) {
      out[key] = BLANKED[key];
      continue;
    }
    out[key] = stripLeaderOnlyFields(v, isLeader);
  }
  if (typeof value.summary === 'string') {
    out.summary = presentSummary(value as unknown as ActivityLike, isLeader);
  }
  return out as Redacted<T>;
}
