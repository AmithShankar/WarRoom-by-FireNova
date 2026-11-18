import { z } from 'zod';
import { router, publicProcedure, loadSessionEditor } from '../trpc';
import { getSessionSecret } from '../context';
import { cocPost } from '../coc/client';
import { isLockOn } from '@/lib/access';
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
    const editor = await loadSessionEditor(ctx);
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
      const player = await ctx.prisma.player.findUnique({
        where: { playerTag: normTag },
        select: { name: true, sessionVersion: true },
      });
      if (secret) {
        // The cookie carries the player's current session version; sign-out bumps it.
        const value = signSession(normTag, secret, new Date(), player?.sessionVersion ?? 0);
        ctx.resHeaders.append('Set-Cookie', cookie(value, SESSION_MAX_AGE_S));
      }
      return { result: 'ok' as const, name: player?.name ?? normTag };
    }),

  // Revokes every session of the signed-in leader (all devices and any copied cookie) by bumping
  // Player.sessionVersion. Only a currently valid session can do this, so an old or stolen-and-
  // already-revoked cookie cannot keep signing the real leader out.
  signOut: publicProcedure.mutation(async ({ ctx }) => {
    const editor = await loadSessionEditor(ctx);
    if (editor) {
      await ctx.prisma.player.updateMany({
        where: { playerTag: editor.tag, sessionVersion: ctx.sessionVersion },
        data: { sessionVersion: { increment: 1 } },
      });
    }
    ctx.resHeaders.append('Set-Cookie', cookie('', 0));
    return { result: 'ok' as const };
  }),
});
