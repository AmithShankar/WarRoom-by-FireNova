import { describe, it, expect } from 'vitest';
import { mapRaidSeasons } from '@/server/coc/map';

describe('mapRaidSeasons', () => {
  it('maps members with base plus bonus attack limit', () => {
    const rows = mapRaidSeasons({ items: [{ startTime: '20261023T070000.000Z', endTime: '20261026T070000.000Z',
      members: [{ tag: '#A', name: 'A', attacks: 6, attackLimit: 5, bonusAttackLimit: 1, capitalResourcesLooted: 21000 }] }] });
    expect(rows).toEqual([{ seasonStart: new Date('2026-10-23T07:00:00Z'), seasonEnd: new Date('2026-10-26T07:00:00Z'),
      playerTag: '#A', name: 'A', attacks: 6, attackLimit: 6, looted: 21000 }]);
  });
  it('season without members yields no rows', () => {
    expect(mapRaidSeasons({ items: [{ startTime: '20261023T070000.000Z', endTime: '20261026T070000.000Z' }] })).toEqual([]);
  });
});
