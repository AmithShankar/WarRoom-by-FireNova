import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rosterRouter } from '@/server/routers/roster';

const LEADER = { playerTag: '#L1', name: 'LeaderX', role: 'Leader', status: 'Staying', sessionVersion: 0 };

function ctx(existingTags: string[] = []) {
  const prisma = {
    player: {
      findUnique: vi.fn(async ({ where }: { where: { playerTag: string } }) =>
        where.playerTag === LEADER.playerTag ? LEADER : null,
      ),
      findUniqueOrThrow: vi.fn(async () => ({ id: 'p1', name: 'Bob', status: 'Staying', postedChallenge: false })),
      update: vi.fn(async () => ({})),
      upsert: vi.fn(async () => ({})),
      findMany: vi.fn(async () => existingTags.map(playerTag => ({ playerTag }))),
    },
    warning: { create: vi.fn(async () => ({})) },
    clanActivity: { create: vi.fn(async () => ({})) },
  };
  return {
    prisma,
    ctx: { prisma, sessionTag: '#L1', sessionVersion: 0, resHeaders: new Headers(), clientIp: null } as never,
  };
}

beforeEach(() => vi.stubEnv('ACCESS_LOCK', 'on'));
afterEach(() => vi.unstubAllEnvs());

describe('importPlayers role restriction (L5)', () => {
  it('never creates a new player with an elevated role', async () => {
    const { prisma, ctx: c } = ctx();
    await rosterRouter.createCaller(c).importPlayers({
      players: [
        { playerTag: '#AAA111', name: 'Imp', townHallLevel: 15, role: 'CoLeader' },
        { playerTag: '#BBB222', name: 'Imp2', townHallLevel: 15, role: 'Leader' },
        { playerTag: '#CCC333', name: 'Eld', townHallLevel: 15, role: 'Elder' },
      ],
    });
    const roles = prisma.player.upsert.mock.calls.map((call: unknown[]) => (call[0] as { create: { role: string } }).create.role);
    expect(roles).toEqual(['Member', 'Member', 'Elder']);
  });

  it('never changes the role of an existing player', async () => {
    const { prisma, ctx: c } = ctx();
    await rosterRouter.createCaller(c).importPlayers({
      players: [{ playerTag: '#AAA111', name: 'Imp', townHallLevel: 15, role: 'Leader' }],
    });
    const arg = (prisma.player.upsert.mock.calls as unknown[][])[0][0] as { update: Record<string, unknown> };
    expect(arg.update).not.toHaveProperty('role');
  });

  it('rejects malformed tags, long names and oversized batches', async () => {
    const { prisma, ctx: c } = ctx();
    const caller = rosterRouter.createCaller(c);
    const ok = { playerTag: '#AAA111', name: 'Imp', townHallLevel: 15, role: 'Member' as const };
    await expect(caller.importPlayers({ players: [{ ...ok, playerTag: 'not-a-tag' }] })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.importPlayers({ players: [{ ...ok, name: 'x'.repeat(51) }] })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.importPlayers({ players: Array.from({ length: 201 }, () => ok) })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(prisma.player.upsert).not.toHaveBeenCalled();
  });
});

describe('leader attribution is written to its own column (M3)', () => {
  it('issueWarning keeps the editor name out of the public summary', async () => {
    const { prisma, ctx: c } = ctx();
    await rosterRouter.createCaller(c).issueWarning({
      playerTag: '#P1', date: new Date(), durationHours: null, reason: 'Behavior', notes: 'n',
    });
    expect(prisma.clanActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ summary: 'Bob warned for Behavior', editorName: 'LeaderX' }),
    });
  });

  it('kickPlayer stores the reason as leader-only detail', async () => {
    const { prisma, ctx: c } = ctx();
    await rosterRouter.createCaller(c).kickPlayer({ playerTag: '#P1', reason: 'toxic' });
    expect(prisma.clanActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ summary: 'Bob removed from clan', detail: 'toxic', editorName: 'LeaderX' }),
    });
    const update = (prisma.player.update.mock.calls as unknown[][])[0][0] as { data: { activity: { create: Record<string, unknown> } } };
    expect(update.data.activity.create).toMatchObject({ summary: 'Removed from clan', detail: 'toxic', editorName: 'LeaderX' });
  });

  it('rejects an over-long kick reason', async () => {
    const { ctx: c } = ctx();
    await expect(
      rosterRouter.createCaller(c).kickPlayer({ playerTag: '#P1', reason: 'x'.repeat(501) }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
