import type { Player } from '@/lib/types';
import { buildCsvBlob } from './csv-export';
import { buildExcelBuffer } from './excel-export';

const SAMPLE_PLAYER: Player = {
  playerTag: '#ABC123',
  name: 'ExamplePlayer',
  townHallLevel: 16,
  role: 'Member',
  status: 'Staying',
  postedChallenge: true,
  cwlStats: { stars: 14, destructionPercentage: 87.5, attacksUsed: 7 },
  joinedAt: new Date().toISOString(),
  donations: 500, donationsReceived: 200, warStars: 150, notes: '',
  troops: { army: '', spells: '', cc: '', comfortBases: [] },
  warPerformance: { totalAttacks: 0, threeStarRate: 0, averageDestruction: 0, missedAttacks: 0 },
  warnings: [], recentActivity: [],
};

export function getSampleCsvBlob(): Blob {
  return buildCsvBlob([SAMPLE_PLAYER]);
}

export async function getSampleExcelBuffer(): Promise<ArrayBuffer> {
  return buildExcelBuffer([SAMPLE_PLAYER]);
}
