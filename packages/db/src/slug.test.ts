import { describe, expect, it } from 'vitest';
import { isSlug, slugForEntry, slugForSpeaker } from './slug';

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

describe('isSlug', () => {
  it('accepts every slug the importer and database produce', () => {
    expect(isSlug(slugForEntry('2026-10-12', 12))).toBe(true);
    expect(isSlug(slugForEntry(null, 3))).toBe(true);
    expect(isSlug(slugForSpeaker('Mary Jo  O’Neil-Smith'))).toBe(true);
    expect(isSlug('test-aaron')).toBe(true);
  });

  it('rejects anything that cannot be a slug', () => {
    for (const value of [
      '',
      'Upper',
      'a b',
      'a/b',
      'a--b',
      '-a',
      'a-',
      '%00',
      'é',
      'x'.repeat(101),
    ]) {
      expect(isSlug(value)).toBe(false);
    }
  });
});
