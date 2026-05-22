import type { Role, WarState } from '@/lib/prisma';
import type { CocMember, CocCurrentWar, CocClanWarLeagueWar } from './schemas';
import { determineResult } from '@/lib/performance';

const ROLE_MAP: Record<CocMember['role'], Role> = {
  leader: 'Leader', coLeader: 'CoLeader', admin: 'Elder', member: 'Member',
};

export function mapMemberToPlayer(m: CocMember) {
  return {
    name: m.name,
    townHallLevel: m.townHallLevel,
    role: ROLE_MAP[m.role],
    donations: m.donations,
    donationsReceived: m.donationsReceived,
    lastSyncedAt: new Date(),
  };
}

const WAR_STATE_MAP: Record<CocCurrentWar['state'], WarState | null> = {
  notInWar: null, preparation: 'preparation', inWar: 'battle', warEnded: 'ended',
};

// CoC timestamps are `20260521T100000.000Z` — not ISO 8601, Date() can't parse it
function parseCocDate(s: string | undefined): Date {
  if (!s) return new Date();
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.exec(s);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  const [, y, mo, d, h, mi, se] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se));
}

export function mapCurrentWar(w: CocCurrentWar) {
  const state = WAR_STATE_MAP[w.state];
  if (!state || !w.clan || !w.opponent) return null;
  const teamSize = w.teamSize ?? 0;
  const attacksPerMember = w.attacksPerMember ?? 2;

  const members = (w.clan.members ?? []).map(m => ({
    tag: m.tag,
    name: m.name,
    mapPosition: m.mapPosition,
    attacksUsed: m.attacks?.length ?? 0,
    attacksTotal: attacksPerMember,
    starsEarned: (m.attacks ?? []).reduce((s, a) => s + a.stars, 0),
    destruction: (m.attacks ?? []).reduce((s, a) => s + a.destructionPercentage, 0),
  }));

  return {
    war: {
      isCurrent: true,
      opponent: w.opponent.name ?? 'Unknown',
      state,
      result: null as null,
      phaseEndsAt: state === 'preparation' ? parseCocDate(w.startTime) : parseCocDate(w.endTime),
      teamSize,
      attacksPerMember,
      clanStars: w.clan.stars,
      opponentStars: w.opponent.stars,
      clanDestruction: w.clan.destructionPercentage,
      opponentDestruction: w.opponent.destructionPercentage,
      clanAttacksUsed: w.clan.attacks ?? 0,
      lastSyncedAt: new Date(),
    },
    members,
  };
}

type WarClanLike = {
  tag?: string;
  name?: string;
  stars: number;
  destructionPercentage: number;
  members?: {
    tag: string;
    name: string;
    mapPosition: number;
    attacks?: { stars: number; destructionPercentage: number }[];
  }[];
};

type ParticipationData = {
  playerTag: string;
  name: string;
  mapPosition: number;
  attacksUsed: number;
  attacksTotal: number;
  starsEarned: number;
  threeStars: number;
  destruction: number;
};

type WarRecordData = {
  warKey: string;
  isCwl: boolean;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  endTime: Date;
  clanStars: number;
  opponentStars: number;
  clanDestruction: number;
  opponentDestruction: number;
  teamSize: number;
  attacksPerMember: number;
  clanAttacksUsed: number;
};

export type WarArchive = { record: WarRecordData; participations: ParticipationData[] };

function membersToParticipations(clan: WarClanLike, attacksPerMember: number): ParticipationData[] {
  return (clan.members ?? []).map(m => {
    const attacks = m.attacks ?? [];
    return {
      playerTag: m.tag,
      name: m.name,
      mapPosition: m.mapPosition,
      attacksUsed: attacks.length,
      attacksTotal: attacksPerMember,
      starsEarned: attacks.reduce((s, a) => s + a.stars, 0),
      threeStars: attacks.filter(a => a.stars === 3).length,
      destruction: attacks.reduce((s, a) => s + a.destructionPercentage, 0),
    };
  });
}

export function mapEndedWarToRecord(w: CocCurrentWar): WarArchive | null {
  if (w.state !== 'warEnded' || !w.clan || !w.opponent) return null;
  const endTime = parseCocDate(w.endTime);
  const attacksPerMember = w.attacksPerMember ?? 2;
  const participations = membersToParticipations(w.clan, attacksPerMember);
  return {
    record: {
      warKey: `reg:${endTime.toISOString()}`,
      isCwl: false,
      opponent: w.opponent.name ?? 'Unknown',
      result: determineResult(
        w.clan.stars, w.clan.destructionPercentage,
        w.opponent.stars, w.opponent.destructionPercentage,
      ),
      endTime,
      clanStars: w.clan.stars,
      opponentStars: w.opponent.stars,
      clanDestruction: w.clan.destructionPercentage,
      opponentDestruction: w.opponent.destructionPercentage,
      teamSize: w.teamSize ?? 0,
      attacksPerMember,
      clanAttacksUsed: participations.reduce((s, p) => s + p.attacksUsed, 0),
    },
    participations,
  };
}

export function mapCwlWarToRecord(
  w: CocClanWarLeagueWar,
  warTag: string,
  clanTag: string,
): WarArchive | null {
  if (w.state !== 'inWar' && w.state !== 'warEnded') return null;
  const norm = (t?: string) => (t ?? '').toUpperCase();
  let fireNova: WarClanLike;
  let foe: WarClanLike;
  if (norm(w.clan.tag) === norm(clanTag)) { fireNova = w.clan; foe = w.opponent; }
  else if (norm(w.opponent.tag) === norm(clanTag)) { fireNova = w.opponent; foe = w.clan; }
  else return null;

  const endTime = parseCocDate(w.endTime);
  const participations = membersToParticipations(fireNova, 1);
  return {
    record: {
      warKey: `cwl:${warTag}`,
      isCwl: true,
      opponent: foe.name ?? 'CWL War',
      result: determineResult(
        fireNova.stars, fireNova.destructionPercentage,
        foe.stars, foe.destructionPercentage,
      ),
      endTime,
      clanStars: fireNova.stars,
      opponentStars: foe.stars,
      clanDestruction: fireNova.destructionPercentage,
      opponentDestruction: foe.destructionPercentage,
      teamSize: w.teamSize ?? 0,
      attacksPerMember: 1,
      clanAttacksUsed: participations.reduce((s, p) => s + p.attacksUsed, 0),
    },
    participations,
  };
}

