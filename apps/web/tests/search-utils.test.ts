import { describe, expect, it } from 'vitest';
import type { Entry } from '@aaronisms/db/schemas';
import {
  filterBySpeaker,
  highlightSegments,
  normalizeQuery,
  searchHref,
  searchTerms,
  speakerFacets,
} from '@/features/search/utils';
import { makeEntry } from './factories';

function entry(slug: string, speakers: Array<[string, string]>): Entry {
  return makeEntry({
    id: slug,
    slug,
    saidOn: '2026-01-01',
    lines: speakers.map(([name, slugOf], i) => ({
      id: `${slug}-${i}`,
      position: i + 1,
      kind: 'line' as const,
      speaker: { id: slugOf, name, slug: slugOf },
      speakerLabel: null,
      text: 'Hello',
    })),
  });
}

describe('normalizeQuery', () => {
  it('trims, collapses whitespace, takes the first of repeated params and caps the length', () => {
    expect(normalizeQuery('  big   pumpkin ')).toBe('big pumpkin');
    expect(normalizeQuery(['a', 'b'])).toBe('a');
    expect(normalizeQuery(undefined)).toBe('');
    expect(normalizeQuery('x'.repeat(500))).toHaveLength(200);
  });
  it('drops control characters that the database rejects', () => {
    expect(normalizeQuery('big\u0000 pump\u0007kin')).toBe('big pumpkin');
    expect(normalizeQuery('a\tb\nc')).toBe('a b c');
  });
  it('caps by code point, never splitting a surrogate pair', () => {
    const cut = normalizeQuery('x'.repeat(199) + '😀😀');
    expect(cut).toBe('x'.repeat(199) + '😀');
    expect(() => encodeURIComponent(cut)).not.toThrow();
  });
});

describe('searchTerms', () => {
  it('drops operators, negations, quotes and one-letter words', () => {
    expect(searchTerms('"big pumpkin" OR gourd -toaster a')).toEqual(['big', 'pumpkin', 'gourd']);
  });
  it('strips punctuation and de-duplicates ignoring case', () => {
    expect(searchTerms('Wow, wow!')).toEqual(['wow']);
  });
});

describe('highlightSegments', () => {
  it('marks matches case-insensitively and keeps the original casing', () => {
    expect(highlightSegments('A Pumpkin is a pumpkin', ['pumpkin'])).toEqual([
      { text: 'A ', match: false },
      { text: 'Pumpkin', match: true },
      { text: ' is a ', match: false },
      { text: 'pumpkin', match: true },
    ]);
  });
  it('treats regex characters in terms literally', () => {
    expect(highlightSegments('what? (really)', ['what?', '(really)'])).toEqual([
      { text: 'what?', match: true },
      { text: ' ', match: false },
      { text: '(really)', match: true },
    ]);
  });
  it('marks whole words only, not parts of longer words', () => {
    expect(highlightSegments('Aaron ran, then Ron left', ['ron'])).toEqual([
      { text: 'Aaron ran, then ', match: false },
      { text: 'Ron', match: true },
      { text: ' left', match: false },
    ]);
    expect(highlightSegments('pumpkins', ['pumpkin'])).toEqual([
      { text: 'pumpkins', match: false },
    ]);
  });
  it('treats accented letters as word characters', () => {
    expect(highlightSegments('café', ['caf'])).toEqual([{ text: 'café', match: false }]);
    expect(highlightSegments('un café!', ['café'])[1]).toEqual({ text: 'café', match: true });
  });
  it('returns the text untouched without terms or matches', () => {
    expect(highlightSegments('plain', [])).toEqual([{ text: 'plain', match: false }]);
    expect(highlightSegments('plain', ['zzz'])).toEqual([{ text: 'plain', match: false }]);
  });
});

describe('speaker facets and filtering', () => {
  const entries = [
    entry('a', [['Test Aaron', 'test-aaron']]),
    entry('b', [
      ['Test Aaron', 'test-aaron'],
      ['Test Aaron', 'test-aaron'],
      ['Pat Example', 'pat-example'],
    ]),
  ];
  it('counts entries per speaker, once per entry, most first', () => {
    expect(speakerFacets(entries)).toEqual([
      { slug: 'test-aaron', name: 'Test Aaron', count: 2 },
      { slug: 'pat-example', name: 'Pat Example', count: 1 },
    ]);
  });
  it('keeps only entries the speaker has a line in', () => {
    expect(filterBySpeaker(entries, 'pat-example').map((e) => e.slug)).toEqual(['b']);
    expect(filterBySpeaker(entries, undefined)).toHaveLength(2);
    expect(filterBySpeaker(entries, 'nobody')).toEqual([]);
  });
});

describe('searchHref', () => {
  it('encodes the query and only adds a speaker alongside one', () => {
    expect(searchHref('big pumpkin', 'test-aaron')).toBe(
      '/search?q=big+pumpkin&speaker=test-aaron',
    );
    expect(searchHref('', 'test-aaron')).toBe('/search');
    expect(searchHref('a&b')).toBe('/search?q=a%26b');
  });
});
