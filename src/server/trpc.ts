import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';
import { isLockOn, canEdit } from '@/lib/access';

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

export type Editor = { tag: string; name: string };

// When ACCESS_LOCK is on, only a signed-in current Leader or Co-Leader may change data.
// The role is re-checked from the database on every call.
// When an editor is signed in, their identity is attached to ctx.editor for audit logging.
export const leaderProcedure = t.procedure.use(async ({ ctx, next }) => {
  const lockOn = isLockOn();
  const player = ctx.sessionTag
    ? await ctx.prisma.player.findUnique({
        where: { playerTag: ctx.sessionTag },
        select: { playerTag: true, name: true, role: true, status: true },
      })
    : null;
  if (lockOn && (!player || !canEdit(player))) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  const editor: Editor | null = player && canEdit(player) ? { tag: player.playerTag, name: player.name } : null;
  return next({ ctx: { editor } });
});
