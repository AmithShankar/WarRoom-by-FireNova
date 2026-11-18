import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rosterRouter } from '@/server/routers/roster';
import { cwlRouter } from '@/server/routers/cwl';
import { performanceRouter } from '@/server/routers/performance';
import { dashboardRouter } from '@/server/routers/dashboard';
import { stripLeaderOnlyFields } from '@/server/leader-only';

const LEADER = { playerTag: '#L1', name: 'LeaderX', role: 'Leader', status: 'Staying', sessionVersion: 0 };
const d = new Date('2026-11-01T00:00:00Z');

function rosterRows() {
  return [
    {
      id: 'p1', playerTag: '#P1', name: 'Bob', role: 'Member', status: 'Kicked',
      notes: 'private player note', kickReason: 'toxic in chat', cwlSlot: null, cwlExcluded: false,
      sessionVersion: 7,
      warnings: [{ id: 'w1', reason: 'Behavior', date: d, notes: 'private warning note' }],
      activity: [
        // New format: attribution and free text kept in their own columns.
        { id: 'a1', date: d, type: 'promotion', summary: 'Marked staying — Clan Games', editorName: 'LeaderX', detail: null },
        { id: 'a2', date: d, type: 'kick', summary: 'Removed from clan', editorName: 'LeaderX', detail: 'toxic in chat' },
        // Legacy rows written before the columns existed.
        { id: 'a3', date: d, type: 'promotion', summary: 'Marked staying — CWL Participation by Old) Leader', editorName: null, detail: null },
        { id: 'a4', date: d, type: 'kick', summary: 'Removed from clan: rude (twice)', editorName: null, detail: null },
      ],
    },
  ];
}

function ctx(sessionTag: string | null, extra: Record<string, unknown> = {}) {
  return {
    prisma: {
      player: {
        findUnique: vi.fn(async ({ where }: { where: { playerTag: string } }) =>
          where.playerTag === LEADER.playerTag ? LEADER : null,
        ),
        findMany: vi.fn(async () => rosterRows()),
      },
      warParticipation: {
        findMany: vi.fn(async () => [
          {
            id: 'wp1', playerTag: '#P1', attacksUsed: 1, attacksTotal: 2, starsEarned: 2, destruction: 80,
            excused: true, excuseReason: 'private excuse: family emergency',
            warRecord: { warKey: 'k', isCwl: false, opponent: 'Opp', result: 'win', endTime: d },
          },
        ]),
      },
      warRecord: {
        findFirst: vi.fn(async () => ({
          id: 'wr1', warKey: 'k', isCwl: false, opponent: 'Opp', result: 'win', endTime: d,
          participations: [
            { id: 'wp1', playerTag: '#P1', name: 'Bob', mapPosition: 1, attacksUsed: 0, attacksTotal: 2,
              excused: true, excuseReason: 'private excuse: family emergency' },
          ],
        })),
      },
      clanActivity: {
        findMany: vi.fn(async () => [
          { id: 'c1', date: d, type: 'kick', player: 'Bob', summary: 'Bob removed from clan', editorName: 'LeaderX', detail: 'toxic in chat' },
          { id: 'c2', date: d, type: 'kick', player: 'Bob', summary: 'Bob removed from clan: spam (x) by Old) Lead', editorName: null, detail: null },
        ]),
      },
      ...extra,
    },
    sessionTag,
    sessionVersion: 0,
    resHeaders: new Headers(),
    clientIp: null,
  } as never;
}

const SECRETS = ['private player note', 'toxic', 'private warning note', 'LeaderX', 'Old) Leader', 'Old) Lead', 'rude', 'spam', 'family emergency'];

function expectNoSecrets(value: unknown) {
  const json = JSON.stringify(value);
  for (const s of SECRETS) expect(json).not.toContain(s);
}

beforeEach(() => vi.stubEnv('ACCESS_LOCK', 'on'));
afterEach(() => vi.unstubAllEnvs());

describe('roster.list for a visitor (M3 + M4)', () => {
  it('removes leader attribution from player activity entries', async () => {
    const [p] = await rosterRouter.createCaller(ctx(null)).list();
    expect(p.activity.map((a: { summary: string }) => a.summary)).toEqual([
      'Marked staying — Clan Games',
      'Removed from clan',
      'Marked staying — CWL Participation',
      'Removed from clan',
    ]);
  });

  it('blanks leader-entered free text and never leaks it anywhere in the response', async () => {
    const res = await rosterRouter.createCaller(ctx(null)).list();
    expect(res[0].notes).toBe('');
    expect(res[0].kickReason).toBeNull();
    expect(res[0].warnings[0].notes).toBe('');
    expectNoSecrets(res);
  });
});

describe('roster.list for a leader', () => {
  it('keeps attribution and free text', async () => {
    const [p] = await rosterRouter.createCaller(ctx('#L1')).list();
    expect(p.notes).toBe('private player note');
    expect(p.kickReason).toBe('toxic in chat');
    expect(p.warnings[0].notes).toBe('private warning note');
    expect(p.activity[0].summary).toBe('Marked staying — Clan Games by LeaderX');
    expect(p.activity[1].summary).toBe('Removed from clan: toxic in chat by LeaderX');
    expect(p.activity[2].summary).toBe('Marked staying — CWL Participation by Old) Leader');
  });
});

describe('other read procedures for a visitor (M4)', () => {
  it('cwl.board blanks player notes and kick reasons', async () => {
    const board = await cwlRouter.createCaller(ctx(null)).board();
    expectNoSecrets(board);
  });

  it('performance.playerWars blanks excuse reasons but keeps the excused flag', async () => {
    const wars = await performanceRouter.createCaller(ctx(null)).playerWars({ playerTag: '#P1' });
    expect(wars[0].excused).toBe(true);
    expect(wars[0].excuseReason).toBeNull();
    expectNoSecrets(wars);
  });

  it('performance.playerWars keeps the excuse reason for a leader', async () => {
    const wars = await performanceRouter.createCaller(ctx('#L1')).playerWars({ playerTag: '#P1' });
    expect(wars[0].excuseReason).toBe('private excuse: family emergency');
  });

  it('dashboard.lastWar blanks excuse reasons but keeps the excused flag (I1)', async () => {
    const war = await dashboardRouter.createCaller(ctx(null)).lastWar();
    expect(war?.participations[0].excused).toBe(true);
    expect(war?.participations[0].excuseReason).toBeNull();
    expectNoSecrets(war);
  });

  it('dashboard.lastWar keeps the excuse reason for a leader (I1)', async () => {
    const war = await dashboardRouter.createCaller(ctx('#L1')).lastWar();
    expect(war?.participations[0].excuseReason).toBe('private excuse: family emergency');
  });

  it('roster.list and cwl.board never send Player.sessionVersion', async () => {
    for (const isVisitor of [true, false]) {
      const c = ctx(isVisitor ? null : '#L1');
      const [p] = await rosterRouter.createCaller(c).list();
      expect(p).not.toHaveProperty('sessionVersion');
      const board = await cwlRouter.createCaller(c).board();
      expect(JSON.stringify(board)).not.toContain('sessionVersion');
    }
  });

  it('dashboard activity feeds hide attribution and kick reasons', async () => {
    const caller = dashboardRouter.createCaller(ctx(null));
    for (const rows of [await caller.activity(), await caller.allActivity(), await caller.playerActivity({ player: 'Bob' })]) {
      expect(rows.map((r: { summary: string }) => r.summary)).toEqual(['Bob removed from clan', 'Bob removed from clan']);
      expectNoSecrets(rows);
    }
  });

  it('dashboard activity shows attribution and reason to a leader', async () => {
    const rows = await dashboardRouter.createCaller(ctx('#L1')).allActivity();
    expect(rows[0].summary).toBe('Bob removed from clan: toxic in chat by LeaderX');
  });
});

describe('stripLeaderOnlyFields', () => {
  it('leaves Dates intact and drops the raw editor/detail columns for everyone', () => {
    const row = { date: d, summary: 'x', editorName: 'LeaderX', detail: 'why' };
    const visitor = stripLeaderOnlyFields(row, false);
    const leader = stripLeaderOnlyFields(row, true);
    expect(visitor.date).toBeInstanceOf(Date);
    expect(visitor).not.toHaveProperty('editorName');
    expect(visitor).not.toHaveProperty('detail');
    expect(leader).not.toHaveProperty('editorName');
    expect(leader.summary).toBe('x: why by LeaderX');
  });
});
