const EDITOR_ROLES = ['Leader', 'CoLeader'];
const EXCLUDED_STATUSES = ['Left', 'Kicked'];

export function isLockOn(env: Record<string, string | undefined> = process.env): boolean {
  return env.ACCESS_LOCK === 'on';
}

export function canEdit(player: { role: string; status: string } | null): boolean {
  if (!player) return false;
  return EDITOR_ROLES.includes(player.role) && !EXCLUDED_STATUSES.includes(player.status);
}
