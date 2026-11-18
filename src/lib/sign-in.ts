import { canEdit } from '@/lib/access';
import { CocApiError } from '@/server/coc/client';

export type SignInResult = 'ok' | 'not_leader' | 'invalid_token' | 'rate_limited';

export type SignInDeps = {
  findPlayer: (tag: string) => Promise<{ role: string; status: string } | null>;
  verify: (tag: string, token: string) => Promise<'ok' | 'invalid'>;
  isRateLimited?: (tag: string) => boolean;
  recordAttempt?: (tag: string) => void;
  resetRateLimit?: (tag: string) => void;
};

export function normaliseTag(tag: string): string {
  return '#' + tag.trim().replace(/^#/, '').toUpperCase();
}

// Only a current Leader or Co-Leader gets their token checked with Supercell.
// Rate limiting prevents abusive spamming of leader tags to deplete the CoC API quota.
// Errors from verify are replaced so the token can never leak through a message.
export async function signInDecision(
  input: { tag: string; token: string },
  deps: SignInDeps,
): Promise<SignInResult> {
  const tag = normaliseTag(input.tag);
  if (deps.isRateLimited?.(tag)) return 'rate_limited';

  const player = await deps.findPlayer(tag);
  if (!canEdit(player)) return 'not_leader';

  deps.recordAttempt?.(tag);

  let status: 'ok' | 'invalid';
  try {
    status = await deps.verify(tag, input.token);
  } catch (e) {
    console.warn('verifytoken failed', e instanceof CocApiError ? e.status : 'network');
    throw new Error('Could not reach Clash of Clans');
  }

  if (status === 'ok') {
    deps.resetRateLimit?.(tag);
    return 'ok';
  }

  return 'invalid_token';
}
