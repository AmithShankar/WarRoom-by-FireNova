import type {
  Player as PrismaPlayer,
  Warning as PrismaWarning,
  ActivityEntry as PrismaActivityEntry,
  ClanActivity as PrismaClanActivity,
  War as PrismaWar,
  WarMember as PrismaWarMember,
  WarRecord as PrismaWarRecord,
  WarParticipation as PrismaWarParticipation,
  Role as PrismaRole,
  PlayerStatus as PrismaPlayerStatus,
  WarningReason as PrismaWarningReason,
  WarState as PrismaWarState,
  WarResult as PrismaWarResult,
} from '@/lib/prisma';
import type {
  ActivityEntry,
  ClanActivity,
  CurrentWar,
  LastWar,
  LastWarMember,
  Player,
  Role,
  PlayerStatus,
  Warning,
  WarningReason,
  WarState,
  WarResult,
  WarMemberInfo,
} from '@/lib/types';

const ROLE: Record<PrismaRole, Role> = {
  Leader: 'Leader',
  CoLeader: 'Co-Leader',
  Elder: 'Elder',
  Member: 'Member',
};

const STATUS: Record<PrismaPlayerStatus, PlayerStatus> = {
  New: 'New',
  Staying: 'Staying',
  Warned: 'Warned',
  Left: 'Left',
  Kicked: 'Kicked',
};

const REASON: Record<PrismaWarningReason, WarningReason> = {
  FailedInitialChallenge: 'Failed Initial Challenge',
  MissedWarAttack: 'Missed War Attack',
  LowDonations: 'Low Donations',
  Behavior: 'Behavior',
  Other: 'Other',
};

const REASON_TO_PRISMA: Record<WarningReason, PrismaWarningReason> = {
  'Failed Initial Challenge': 'FailedInitialChallenge',
  'Missed War Attack': 'MissedWarAttack',
  'Low Donations': 'LowDonations',
  Behavior: 'Behavior',
  Other: 'Other',
};

export function toPrismaWarningReason(reason: WarningReason): PrismaWarningReason {
  return REASON_TO_PRISMA[reason];
}

const iso = (d: Date | string): string =>
  typeof d === 'string' ? d : d.toISOString();

function mapWarning(w: PrismaWarning): Warning {
  const hasContext =
    w.warPerfected !== null || w.mirrorCleared !== null || w.thLevelCleared !== null;
  return {
    id: w.id,
    date: iso(w.date),
    reason: REASON[w.reason],
    notes: w.notes,
    ...(w.durationHours != null ? { durationHours: w.durationHours } : {}),
    ...(w.expirationDate != null ? { expirationDate: iso(w.expirationDate) } : {}),
    context: hasContext
      ? {
          warPerfected: w.warPerfected ?? false,
          mirrorCleared: w.mirrorCleared ?? false,
          thLevelCleared: w.thLevelCleared ?? false,
        }
      : undefined,
  };
}

function mapActivity(a: PrismaActivityEntry): ActivityEntry {
  return {
    id: a.id,
    date: iso(a.date),
    type: a.type,
    summary: a.summary,
  };
}

type PrismaPlayerWithRelations = PrismaPlayer & {
  warnings: PrismaWarning[];
  activity: PrismaActivityEntry[];
};

export function mapPlayer(p: PrismaPlayerWithRelations): Player {
  return {
    playerTag: p.playerTag,
    name: p.name,
    townHallLevel: p.townHallLevel,
    role: ROLE[p.role],
    status: STATUS[p.status],
    postedChallenge: p.postedChallenge,
    joinedAt: iso(p.joinedAt),
    donations: p.donations,
    donationsReceived: p.donationsReceived,
    warStars: p.warStars,
    notes: p.notes,
    troops: {
      army: p.troopArmy,
      spells: p.troopSpells,
      cc: p.troopCc,
      comfortBases: p.comfortBases,
    },
    warPerformance: {
      totalAttacks: p.warTotalAttacks,
      threeStarRate: p.warThreeStarRate,
      averageDestruction: p.warAvgDestruction,
      missedAttacks: p.warMissedAttacks,
    },
    cwlStats: {
      stars: p.cwlStars,
      destructionPercentage: p.cwlDestruction,
      attacksUsed: p.cwlAttacksUsed,
    },
    warnings: p.warnings.map(mapWarning),
    recentActivity: p.activity.map(mapActivity),
    ...(p.removedAt ? { removedAt: iso(p.removedAt) } : {}),
    ...(p.kickReason ? { kickReason: p.kickReason } : {}),
  };
}

export function mapBoardPlayer(p: PrismaPlayer): Player {
  return mapPlayer({ ...p, warnings: [], activity: [] });
}

export function mapClanActivity(a: PrismaClanActivity): ClanActivity {
  return {
    id: a.id,
    date: iso(a.date),
    type: a.type as ClanActivity['type'],
    ...(a.player ? { player: a.player } : {}),
    summary: a.summary,
  };
}

const WAR_STATE: Record<PrismaWarState, WarState> = {
  preparation: 'preparation',
  battle: 'battle',
  ended: 'ended',
};

const WAR_RESULT: Record<PrismaWarResult, WarResult> = {
  win: 'win',
  loss: 'loss',
  draw: 'draw',
};

export function mapLastWar(
  w: PrismaWarRecord & { participations: PrismaWarParticipation[] },
): LastWar {
  const result = w.result as PrismaWarResult | null;
  return {
    opponent: w.opponent,
    isCwl: w.isCwl,
    result: result ? WAR_RESULT[result] : null,
    endTime: iso(w.endTime),
    teamSize: w.teamSize,
    attacksPerMember: w.attacksPerMember,
    clanStars: w.clanStars,
    opponentStars: w.opponentStars,
    clanDestruction: w.clanDestruction,
    opponentDestruction: w.opponentDestruction,
    clanAttacksUsed: w.clanAttacksUsed,
    members: w.participations.map((p: PrismaWarParticipation): LastWarMember => ({
      playerTag: p.playerTag,
      name: p.name,
      mapPosition: p.mapPosition,
      attacksUsed: p.attacksUsed,
      attacksTotal: p.attacksTotal,
      starsEarned: p.starsEarned,
      destruction: p.destruction,
      excused: p.excused,
    })),
  };
}

export function mapCurrentWar(w: PrismaWar & { members: PrismaWarMember[] }): CurrentWar {
  return {
    opponent: w.opponent,
    state: WAR_STATE[w.state],
    phaseEndsAt: iso(w.phaseEndsAt),
    teamSize: w.teamSize,
    clanStars: w.clanStars,
    opponentStars: w.opponentStars,
    clanDestruction: w.clanDestruction,
    opponentDestruction: w.opponentDestruction,
    clanAttacksUsed: w.clanAttacksUsed,
    attacksPerMember: w.attacksPerMember,
    members: w.members.map((m): WarMemberInfo => ({
      tag: m.tag,
      name: m.name,
      mapPosition: m.mapPosition,
      attacksUsed: m.attacksUsed,
      attacksTotal: m.attacksTotal,
      starsEarned: m.starsEarned,
      destruction: m.destruction,
    })),
    lastSyncedAt: iso(w.lastSyncedAt),
    ...(w.result ? { result: WAR_RESULT[w.result] } : {}),
  };
}
