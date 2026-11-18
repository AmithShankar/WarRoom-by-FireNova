const EDITOR_ROLES = ['Leader', 'CoLeader'];
const EXCLUDED_STATUSES = ['Left', 'Kicked'];

// Fails closed: the lock is on unless ACCESS_LOCK is exactly "off".
// Missing, empty or any other value (including "Off" or "false") keeps visitors read-only,
// so a missed or mistyped deploy setting can never open the app to anonymous writes.
export function isLockOn(env: Record<string, string | undefined> = process.env): boolean {
  return env.ACCESS_LOCK !== 'off';
}

export function canEdit(player: { role: string; status: string } | null): boolean {
  if (!player) return false;
  return EDITOR_ROLES.includes(player.role) && !EXCLUDED_STATUSES.includes(player.status);
}
