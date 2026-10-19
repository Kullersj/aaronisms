import { describe, expect, it } from 'vitest';
import type { Entry } from '@aaronisms/db/schemas';
import {
  compareEntries,
  entryDescription,
  entrySummary,
  formatEntryDate,
  formatStageDirection,
  groupEntriesByYear,
} from '@/features/entries/utils';

function entry(slug: string, saidOn: string | null, text = 'Hello'): Entry {
  return {
    id: slug,
    slug,
    saidOn,
    era: saidOn ? 'modern' : 'college',
    status: 'published',
    imagePath: null,
    imageAlt: null,
    noPreview: false,
    publishedAt: null,
    createdAt: '2026-01-01T00:00:00+00:00',
    lines: [
      {
        id: `${slug}-1`,
        position: 1,
        kind: 'line',
        speaker: { id: 's', name: 'Test Aaron', slug: 'test-aaron' },
        speakerLabel: null,
        text,
      },
    ],
  };
}

describe('formatEntryDate', () => {
  it('writes the long US form', () => {
    expect(formatEntryDate('2026-10-12')).toBe('October 12, 2026');
    expect(formatEntryDate('2020-03-06')).toBe('March 6, 2020');
  });
});

describe('compareEntries', () => {
  it('puts newest first and keeps same-day entries in counter order', () => {
    const sorted = [
      entry('2026-01-05-2', '2026-01-05'),
      entry('2026-02-14-1', '2026-02-14'),
      entry('2026-01-05-10', '2026-01-05'),
      entry('2026-01-05-1', '2026-01-05'),
    ].sort(compareEntries);
    expect(sorted.map((e) => e.slug)).toEqual([
      '2026-02-14-1',
      '2026-01-05-1',
      '2026-01-05-2',
      '2026-01-05-10',
    ]);
  });

  it('sorts undated entries last', () => {
    const sorted = [entry('college-1', null), entry('2026-01-05-1', '2026-01-05')].sort(
      compareEntries,
    );
    expect(sorted[0]?.slug).toBe('2026-01-05-1');
  });
});

describe('groupEntriesByYear', () => {
  it('groups newest year first and skips undated entries', () => {
    const groups = groupEntriesByYear([
      entry('2025-12-31-1', '2025-12-31'),
      entry('2026-01-05-1', '2026-01-05'),
      entry('2026-01-05-2', '2026-01-05'),
      entry('college-1', null),
    ]);
    expect(groups.map((g) => g.year)).toEqual([2026, 2025]);
    expect(groups[0]?.entries.map((e) => e.slug)).toEqual(['2026-01-05-1', '2026-01-05-2']);
  });

  it('returns nothing for no entries', () => {
    expect(groupEntriesByYear([])).toEqual([]);
  });
});

describe('formatStageDirection', () => {
  it('wraps in brackets once', () => {
    expect(formatStageDirection('Everyone nods.')).toBe('[Everyone nods.]');
    expect(formatStageDirection('[Everyone nods.]')).toBe('[Everyone nods.]');
  });
});

describe('entrySummary', () => {
  it('uses the first spoken line with its speaker and truncates', () => {
    expect(entrySummary(entry('a', '2026-01-05', 'Hi'))).toBe('Test Aaron: Hi');
    expect(entrySummary(entry('a', '2026-01-05', 'x'.repeat(300)), 20)).toHaveLength(20);
  });
});

describe('entryDescription', () => {
  it('quotes the entry unless it opted out of previews', () => {
    expect(entryDescription(entry('a', '2026-01-05', 'Hi'))).toBe('Test Aaron: Hi');
    const hidden = { ...entry('a', '2026-01-05', 'Secret'), noPreview: true };
    expect(entryDescription(hidden)).toBe('An Aaronism.');
    expect(entryDescription(hidden)).not.toContain('Secret');
  });
});
