import { describe, expect, it } from 'vitest';
import type { Entry } from '@aaronisms/db/schemas';
import { ogContent, truncateText } from '@/features/entries/og';

function entryWith(lines: Array<{ kind: 'line' | 'stage' | 'context'; text: string }>): Entry {
  return {
    id: 'e',
    slug: 'e',
    saidOn: '2026-01-01',
    era: 'modern',
    status: 'published',
    imagePath: null,
    imageAlt: null,
    publishedAt: null,
    createdAt: '2026-01-01T00:00:00+00:00',
    lines: lines.map((line, i) => ({
      id: `l${i}`,
      position: i + 1,
      kind: line.kind,
      speaker: line.kind === 'line' ? { id: 's', name: 'Test Aaron', slug: 'test-aaron' } : null,
      speakerLabel: null,
      text: line.text,
    })),
  };
}

describe('truncateText', () => {
  it('leaves short text alone and cuts long text at a word with an ellipsis', () => {
    expect(truncateText('short', 10)).toBe('short');
    const cut = truncateText('one two three four five', 14);
    expect(cut).toBe('one two three…');
    expect(cut.length).toBeLessThanOrEqual(14);
  });
  it('hard-cuts a single very long word', () => {
    expect(truncateText('a'.repeat(50), 10)).toBe(`${'a'.repeat(9)}…`);
  });
});

describe('ogContent', () => {
  it('skips stage directions and keeps speakers', () => {
    const { lines, truncated } = ogContent(
      entryWith([
        { kind: 'context', text: 'At the gourd show:' },
        { kind: 'stage', text: 'Everyone nods.' },
        { kind: 'line', text: 'It is a gourd.' },
      ]),
    );
    expect(lines).toEqual([
      { speaker: null, text: 'At the gourd show:' },
      { speaker: 'Test Aaron', text: 'It is a gourd.' },
    ]);
    expect(truncated).toBe(false);
  });
  it('stays inside the character budget and flags truncation', () => {
    const long = 'word '.repeat(200).trim();
    const { lines, truncated } = ogContent(entryWith([{ kind: 'line', text: long }]), 100);
    expect(truncated).toBe(true);
    expect(lines[0]?.text.length).toBeLessThanOrEqual(100);
    expect(lines[0]?.text.endsWith('…')).toBe(true);
  });
  it('limits the number of lines', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      kind: 'line' as const,
      text: `Line ${i}`,
    }));
    const { lines, truncated } = ogContent(entryWith(many));
    expect(lines).toHaveLength(4);
    expect(truncated).toBe(true);
  });
});
