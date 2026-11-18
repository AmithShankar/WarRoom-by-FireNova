import { z } from 'zod';
import { router, publicProcedure, type Editor } from '../trpc';
import { getSessionSecret } from '../context';
import { cocPost } from '../coc/client';
import { isLockOn, canEdit } from '@/lib/access';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE_S } from '@/lib/session';
import { signInDecision, normaliseTag } from '@/lib/sign-in';
import { signInRateLimiter } from '@/lib/rate-limit';

function cookie(value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

// The verifytoken response echoes the token, so only its status is read and nothing is logged.
async function verifyToken(tag: string, token: string): Promise<'ok' | 'invalid'> {
  const res = await cocPost<{ status?: unknown }>(`/players/${tag}/verifytoken`, { token });
  return res?.status === 'ok' ? 'ok' : 'invalid';
}

export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    const lockOn = isLockOn();
    let editor: Editor | null = null;
    if (ctx.sessionTag) {
      const player = await ctx.prisma.player.findUnique({
        where: { playerTag: ctx.sessionTag },
        select: { playerTag: true, name: true, role: true, status: true },
      });
      if (player && canEdit(player)) editor = { tag: player.playerTag, name: player.name };
    }
    return { lockOn, editor, canEdit: !lockOn || editor !== null };
  }),

  signIn: publicProcedure
    .input(z.object({ tag: z.string().min(1).max(20), token: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const secret = getSessionSecret();
      if (!secret && isLockOn()) throw new Error('SESSION_SECRET is not set');
      const ipKey = ctx.clientIp ? `ip:${ctx.clientIp}` : null;
      const result = await signInDecision(input, {
        findPlayer: (tag) =>
          ctx.prisma.player.findUnique({
            where: { playerTag: tag },
            select: { role: true, status: true },
          }),
        verify: verifyToken,
        isRateLimited: (tag) =>
          signInRateLimiter.isRateLimited(tag) || (ipKey ? signInRateLimiter.isRateLimited(ipKey) : false),
        recordAttempt: (tag) => {
          signInRateLimiter.recordAttempt(tag);
          if (ipKey) signInRateLimiter.recordAttempt(ipKey);
        },
        resetRateLimit: (tag) => {
          signInRateLimiter.reset(tag);
          if (ipKey) signInRateLimiter.reset(ipKey);
        },
      });
      if (result !== 'ok') return { result };
      const normTag = normaliseTag(input.tag);
      if (secret) {
        const value = signSession(normTag, secret, new Date());
        ctx.resHeaders.append('Set-Cookie', cookie(value, SESSION_MAX_AGE_S));
      }
      const player = await ctx.prisma.player.findUnique({
        where: { playerTag: normTag },
        select: { name: true },
      });
      return { result: 'ok' as const, name: player?.name ?? normTag };
    }),

  signOut: publicProcedure.mutation(({ ctx }) => {
    ctx.resHeaders.append('Set-Cookie', cookie('', 0));
    return { result: 'ok' as const };
  }),
});
