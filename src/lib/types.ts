// ============================================================================
// WarRoom by FireNova - Shared Type Definitions
// ============================================================================
// All types are framework-agnostic so the mock data layer can be swapped
// for a real TanStack Query + backend integration without touching the UI.

export type Role = 'Leader' | 'Co-Leader' | 'Elder' | 'Member';

export type PlayerStatus = 'New' | 'Staying' | 'Left' | 'Kicked' | 'Warned';

export type WarWarningContext = {
  warPerfected: boolean;
  mirrorCleared: boolean;
  thLevelCleared: boolean;
};

export type WarningReason =
  | 'Failed Initial Challenge'
  | 'Missed War Attack'
  | 'Low Donations'
  | 'Behavior'
  | 'Other';

export type Warning = {
  id: string;
  date: string; // ISO
  durationHours?: number;
  expirationDate?: string; // ISO
  reason: WarningReason;
  context?: WarWarningContext;
  notes: string;
};

export type CWLStats = {
  stars: number;
  destructionPercentage: number;
  attacksUsed: number;
};

export type WarPerformance = {
  totalAttacks: number;
  threeStarRate: number; // 0-1
  averageDestruction: number; // 0-100
  missedAttacks: number;
};

export type TroopPreference = {
  army: string;
  spells: string;
  cc: string;
  comfortBases: string[];
};

export type ActivityEntry = {
  id: string;
  date: string; // ISO
  type: 'join' | 'warning' | 'kick' | 'promotion' | 'note';
  summary: string;
};

export type Player = {
  playerTag: string;
  name: string;
  townHallLevel: number;
  role: Role;
  status: PlayerStatus;
  postedChallenge: boolean;
  joinedAt: string; // ISO
  donations: number;
  donationsReceived: number;
  warStars: number;
  notes: string;
  troops: TroopPreference;
  warPerformance: WarPerformance;
  cwlStats: CWLStats;
  warnings: Warning[];
  recentActivity: ActivityEntry[];
  removedAt?: string;   // ISO - when the player left or was kicked
  kickReason?: string;  // reason text - set only when status is 'Kicked'
};

export const CWL_ACTIVE_CAPACITY = 15;
export const CWL_WAR_SIZE = 15;

export type DashboardOverview = {
  totalMembers: number;
  activeWarnings: number;
  cwlStarsThisRound: number;
  donationBalance: number; // donated - received (clan total this season)
  newJoinersPending: number;
};

export type WarState = 'preparation' | 'battle' | 'ended';
export type WarResult = 'win' | 'loss' | 'draw';

export type PerformanceScope = 'all' | 'regular' | 'cwl';

export type PlayerPerformance = {
  playerTag: string;
  name: string;
  warsParticipated: number;
  attacksUsed: number;
  attacksAvailable: number;
  totalStars: number;
  threeStarAttacks: number;
  threeStarRate: number; // 0-1
  avgDestruction: number; // 0-100
  missedAttacks: number;
  excusedMisses: number;
};

export type WarMemberInfo = {
  tag: string;
  name: string;
  mapPosition: number;
  attacksUsed: number;
  attacksTotal: number;
  starsEarned: number;
  destruction: number;   // summed destruction % across this member's attacks
};

export type CurrentWar = {
  opponent: string;
  state: WarState;
  phaseEndsAt: string;          // ISO - when the prep or battle phase ends
  teamSize: number;             // players per side
  clanStars: number;
  opponentStars: number;
  clanDestruction: number;      // 0-100
  opponentDestruction: number;  // 0-100
  clanAttacksUsed: number;
  attacksPerMember: number;     // 1 = CWL, 2 = classic war
  members: WarMemberInfo[];
  lastSyncedAt: string;         // ISO - when this war data was last synced from CoC
  result?: WarResult;           // set only when state === 'ended'
};

export type ClanActivity = {
  id: string;
  date: string;
  type: 'join' | 'warning' | 'kick' | 'promotion' | 'cwl' | 'war';
  player?: string;
  summary: string;
};

export type LastWarMember = {
  playerTag: string;
  name: string;
  mapPosition: number;
  attacksUsed: number;
  attacksTotal: number;
  starsEarned: number;
  destruction: number;
  excused: boolean;
};

export type LastWar = {
  opponent: string;
  isCwl: boolean;
  result: WarResult | null;
  endTime: string;
  teamSize: number;
  attacksPerMember: number;
  clanStars: number;
  opponentStars: number;
  clanDestruction: number;
  opponentDestruction: number;
  clanAttacksUsed: number;
  members: LastWarMember[];
};
