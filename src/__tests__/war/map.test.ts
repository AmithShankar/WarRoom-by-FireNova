import { describe, it, expect } from 'vitest';
import { mapEndedWarToRecord, mapCwlWarToRecord } from '@/server/coc/map';
import type { CocCurrentWar, CocClanWarLeagueWar } from '@/server/coc/schemas';

const baseRegularWar: CocCurrentWar = {
  state: 'warEnded',
  teamSize: 10,
  attacksPerMember: 2,
  endTime: '20260520T120000.000Z',
  clan: {
    stars: 25,
    destructionPercentage: 85.5,
    attacks: 18,
    members: [
      { tag: '#A', name: 'Alice', mapPosition: 1, attacks: [{ stars: 3, destructionPercentage: 100 }, { stars: 2, destructionPercentage: 80 }] },
      { tag: '#B', name: 'Bob', mapPosition: 2, attacks: [{ stars: 2, destructionPercentage: 75 }] },
    ],
  },
  opponent: {
    stars: 20,
    destructionPercentage: 70.0,
  },
};

describe('mapEndedWarToRecord', () => {
  it('returns null when war is not ended', () => {
    expect(mapEndedWarToRecord({ ...baseRegularWar, state: 'inWar' })).toBeNull();
  });

  it('populates aggregate score fields', () => {
    const result = mapEndedWarToRecord(baseRegularWar);
    expect(result).not.toBeNull();
    const r = result!.record;
    expect(r.clanStars).toBe(25);
    expect(r.opponentStars).toBe(20);
    expect(r.clanDestruction).toBe(85.5);
    expect(r.opponentDestruction).toBe(70.0);
    expect(r.teamSize).toBe(10);
    expect(r.attacksPerMember).toBe(2);
    expect(r.clanAttacksUsed).toBe(3); // Alice used 2, Bob used 1
  });

  it('determines win correctly', () => {
    const result = mapEndedWarToRecord(baseRegularWar);
    expect(result!.record.result).toBe('win');
  });
});

const baseCwlWar: CocClanWarLeagueWar = {
  state: 'warEnded',
  teamSize: 15,
  endTime: '20260520T120000.000Z',
  clan: {
    tag: '#FIRENOVA',
    name: 'FireNova',
    stars: 12,
    destructionPercentage: 60.0,
    members: [
      { tag: '#A', name: 'Alice', mapPosition: 1, attacks: [{ stars: 3, destructionPercentage: 100 }] },
      { tag: '#B', name: 'Bob', mapPosition: 2, attacks: [] },
    ],
  },
  opponent: {
    tag: '#FOE',
    name: 'FoeClan',
    stars: 10,
    destructionPercentage: 50.0,
  },
};

describe('mapCwlWarToRecord', () => {
  it('returns null when FireNova is not in the war', () => {
    expect(mapCwlWarToRecord(baseCwlWar, 'cwl:tag1', '#OTHER')).toBeNull();
  });

  it('populates aggregate score fields for CWL', () => {
    const result = mapCwlWarToRecord(baseCwlWar, 'cwl:tag1', '#FIRENOVA');
    expect(result).not.toBeNull();
    const r = result!.record;
    expect(r.clanStars).toBe(12);
    expect(r.opponentStars).toBe(10);
    expect(r.clanDestruction).toBe(60.0);
    expect(r.opponentDestruction).toBe(50.0);
    expect(r.teamSize).toBe(15);
    expect(r.attacksPerMember).toBe(1);
    expect(r.clanAttacksUsed).toBe(1); // only Alice attacked
  });

  it('returns null when state is preparation', () => {
    expect(mapCwlWarToRecord({ ...baseCwlWar, state: 'preparation' }, 'cwl:tag1', '#FIRENOVA')).toBeNull();
  });
});
