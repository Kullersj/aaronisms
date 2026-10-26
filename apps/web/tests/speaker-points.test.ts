import { describe, expect, it } from 'vitest';
import { nextToPass, rankSpeakers } from '@/features/speakers/points';

const speaker = (id: string, points: number) => ({ id, name: id, points });

describe('rankSpeakers', () => {
  it('orders by points, then name, and shares a rank on a tie', () => {
    const ranked = rankSpeakers([
      speaker('Cat', 5),
      speaker('Bea', 20),
      speaker('Al', 5),
      speaker('Dee', 1),
    ]);
    expect(ranked.map((s) => [s.name, s.rank])).toEqual([
      ['Bea', 1],
      ['Al', 2],
      ['Cat', 2],
      ['Dee', 4],
    ]);
  });

  it('is empty for no speakers', () => {
    expect(rankSpeakers([])).toEqual([]);
  });
});

describe('nextToPass', () => {
  const ranked = rankSpeakers([speaker('Bea', 20), speaker('Al', 5), speaker('Cat', 5)]);

  it('names the speaker just ahead and the points it takes to pass them', () => {
    expect(nextToPass(ranked, 'Al')).toMatchObject({ speaker: { name: 'Bea' }, pointsNeeded: 16 });
  });

  it('skips a speaker tied on points', () => {
    expect(nextToPass(ranked, 'Cat')?.speaker.name).toBe('Bea');
  });

  it('is null at the top and for an unknown speaker', () => {
    expect(nextToPass(ranked, 'Bea')).toBeNull();
    expect(nextToPass(ranked, 'Nobody')).toBeNull();
  });
});
