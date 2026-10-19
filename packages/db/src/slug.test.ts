import { describe, expect, it } from 'vitest';
import { slugForEntry, slugForSpeaker } from './slug';

describe('slugForEntry', () => {
  it('combines the date with a per-day counter', () => {
    expect(slugForEntry('2026-10-12', 1)).toBe('2026-10-12-1');
    expect(slugForEntry('2026-10-12', 12)).toBe('2026-10-12-12');
  });

  it('uses a college counter for undated entries', () => {
    expect(slugForEntry(null, 3)).toBe('college-3');
  });

  it('rejects bad counters and dates', () => {
    expect(() => slugForEntry('2026-10-12', 0)).toThrow(RangeError);
    expect(() => slugForEntry('2026-10-12', 1.5)).toThrow(RangeError);
    expect(() => slugForEntry('October 12, 2026', 1)).toThrow(RangeError);
  });
});

describe('slugForSpeaker', () => {
  it('lowercases and hyphenates', () => {
    expect(slugForSpeaker('Arob')).toBe('arob');
    expect(slugForSpeaker('Mary Jo')).toBe('mary-jo');
    expect(slugForSpeaker('  Everyone else! ')).toBe('everyone-else');
  });

  it('strips accents', () => {
    expect(slugForSpeaker('Zoë')).toBe('zoe');
  });
});
