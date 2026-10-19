import { describe, expect, it } from 'vitest';
import type { ParsedEntry } from './parse';
import { createSpeakerRegistry, planEntries } from './plan';

const entry = (
  saidOn: string | null,
  sectionIndex: number,
  ...labels: (string | null)[]
): ParsedEntry => ({
  saidOn,
  sectionIndex,
  imageUrls: [],
  lines: labels.map((speakerLabel) => ({ speakerLabel, text: 'x', kind: 'line' as const })),
});

describe('planEntries', () => {
  it('numbers entries per date in page order and undated entries globally', () => {
    const speakers = createSpeakerRegistry();
    const modern = planEntries(
      [entry('2026-10-12', 2, 'A'), entry('2026-10-12', 3, 'A'), entry('2026-10-11', 4, 'A')],
      'modern',
      speakers,
    );
    expect(modern.map((e) => e.slug)).toEqual(['2026-10-12-1', '2026-10-12-2', '2026-10-11-1']);
    const college = planEntries([entry(null, 1, 'A'), entry(null, 2, 'A')], 'college', speakers);
    expect(college.map((e) => e.slug)).toEqual(['college-1', 'college-2']);
  });

  it('merges speaker name variants and keeps group labels as labels', () => {
    const speakers = createSpeakerRegistry();
    const [planned] = planEntries(
      [entry('2026-01-01', 1, 'Arob', 'A-Rob', 'arob', 'Everyone else', null, 'Staub', 'staub')],
      'modern',
      speakers,
    );
    expect(planned?.lines.map((l) => l.speakerName)).toEqual([
      'Arob',
      'Arob',
      'Arob',
      null,
      null,
      'Staub',
      'Staub',
    ]);
    expect(planned?.lines[3]?.speakerLabel).toBe('Everyone else');
    expect(speakers.names).toEqual(['Arob', 'Staub']);
  });

  it('skips entries with no lines and keeps the section index', () => {
    const planned = planEntries(
      [entry('2026-01-01', 7), entry('2026-01-02', 8, 'A')],
      'modern',
      createSpeakerRegistry(),
    );
    expect(planned).toHaveLength(1);
    expect(planned[0]?.sectionIndex).toBe(8);
  });
});
