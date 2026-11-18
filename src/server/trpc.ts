import { initTRPC, TRPCError, type TRPCDefaultErrorShape } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';
import { isLockOn, canEdit } from '@/lib/access';

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

// Internal errors (Prisma, upstream API, bugs) never reach the browser with their details.
// The full error is logged server-side by the route handler's onError.
// Intentional TRPCErrors such as BAD_REQUEST keep their message.
export function formatError({ shape, error }: { shape: TRPCDefaultErrorShape; error: TRPCError }): TRPCDefaultErrorShape {
  if (error.code !== 'INTERNAL_SERVER_ERROR' || process.env.NODE_ENV === 'development') return shape;
  const { stack: _stack, ...data } = shape.data;
  return { ...shape, message: GENERIC_ERROR_MESSAGE, data };
}

const t = initTRPC.context<Context>().create({ transformer: superjson, errorFormatter: formatError });

export const router = t.router;
export const publicProcedure = t.procedure;

export type Editor = { tag: string; name: string };

type SessionCtx = Pick<Context, 'prisma' | 'sessionTag'> & { sessionVersion?: number };

/**
 * The signed-in, current Leader or Co-Leader, or null.
 * Re-checked against the database on every call: role, status and the session version
 * (bumped on sign-out to revoke every copy of the cookie).
 */
export async function loadSessionEditor(ctx: SessionCtx): Promise<Editor | null> {
  if (!ctx.sessionTag) return null;
  const player = await ctx.prisma.player.findUnique({
    where: { playerTag: ctx.sessionTag },
    select: { playerTag: true, name: true, role: true, status: true, sessionVersion: true },
  });
  if (!player || !canEdit(player)) return null;
  if ((player.sessionVersion ?? 0) !== (ctx.sessionVersion ?? 0)) return null;
  return { tag: player.playerTag, name: player.name };
}

// When ACCESS_LOCK is on (the default), only a signed-in current Leader or Co-Leader may change data.
// When an editor is signed in, their identity is attached to ctx.editor for audit logging.
export const leaderProcedure = t.procedure.use(async ({ ctx, next }) => {
  const editor = await loadSessionEditor(ctx);
  if (isLockOn() && !editor) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { editor } });
});

// For reads that return leader-only data: ctx.isLeader says whether the caller may see it.
// With the lock explicitly off everyone may edit, so everyone also sees the leader view.
export const viewerProcedure = t.procedure.use(async ({ ctx, next }) => {
  const isLeader = !isLockOn() || (await loadSessionEditor(ctx)) !== null;
  return next({ ctx: { isLeader } });
});
