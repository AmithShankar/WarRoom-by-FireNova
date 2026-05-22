import { describe, it, expect } from 'vitest';
import { sortLineupByTownHall } from '@/lib/cwl-order';

describe('sortLineupByTownHall', () => {
  it('orders by town hall descending', () => {
    const r = sortLineupByTownHall([
      { playerTag: '#A', name: 'A', townHallLevel: 14 },
      { playerTag: '#B', name: 'B', townHallLevel: 16 },
      { playerTag: '#C', name: 'C', townHallLevel: 15 },
    ]);
    expect(r).toEqual(['#B', '#C', '#A']);
  });
  it('breaks town hall ties by name ascending', () => {
    const r = sortLineupByTownHall([
      { playerTag: '#Z', name: 'Zed', townHallLevel: 16 },
      { playerTag: '#A', name: 'Abe', townHallLevel: 16 },
    ]);
    expect(r).toEqual(['#A', '#Z']);
  });
  it('returns an empty array for no players', () => {
    expect(sortLineupByTownHall([])).toEqual([]);
  });
});
