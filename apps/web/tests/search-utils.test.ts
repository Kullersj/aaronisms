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

function entry(slug: string, speakers: Array<[string, string]>): Entry {
  return {
    id: slug,
    slug,
    saidOn: '2026-01-01',
    era: 'modern',
    status: 'published',
    imagePath: null,
    imageAlt: null,
    publishedAt: null,
    createdAt: '2026-01-01T00:00:00+00:00',
    lines: speakers.map(([name, slugOf], i) => ({
      id: `${slug}-${i}`,
      position: i + 1,
      kind: 'line' as const,
      speaker: { id: slugOf, name, slug: slugOf },
      speakerLabel: null,
      text: 'Hello',
    })),
  };
}

describe('normalizeQuery', () => {
  it('trims, collapses whitespace, takes the first of repeated params and caps the length', () => {
    expect(normalizeQuery('  big   pumpkin ')).toBe('big pumpkin');
    expect(normalizeQuery(['a', 'b'])).toBe('a');
    expect(normalizeQuery(undefined)).toBe('');
    expect(normalizeQuery('x'.repeat(500))).toHaveLength(200);
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
