import { describe, expect, it } from 'vitest';
import { entryEditSchema, type Entry } from '@aaronisms/db/schemas';
import {
  buildLinePayload,
  entryToEditValues,
  speakerNamesBySlug,
} from '@/features/submissions/lines';
import { makeEntry } from './factories';

const lines = [
  { kind: 'line' as const, speaker: 'Test Aaron', text: 'First' },
  { kind: 'stage' as const, speaker: null, text: 'Everyone nods.' },
  { kind: 'line' as const, speaker: 'test-aaron', text: 'Again' },
  { kind: 'line' as const, speaker: '???', text: 'Mystery' },
];

describe('speakerNamesBySlug', () => {
  it('collects spoken-line speakers once per slug and skips unsluggable names', () => {
    expect([...speakerNamesBySlug(lines)]).toEqual([['test-aaron', 'Test Aaron']]);
  });
});

describe('buildLinePayload', () => {
  const ids = new Map([['test-aaron', 'speaker-1']]);

  it('puts the setup line first and links known speakers', () => {
    const payload = buildLinePayload({ context: ' Setup: ', lines }, ids);
    expect(payload.map((l) => l.kind)).toEqual(['context', 'line', 'stage', 'line', 'line']);
    expect(payload[0]).toEqual({
      kind: 'context',
      speaker_id: null,
      speaker_label: null,
      text: 'Setup:',
    });
    expect(payload[1]).toMatchObject({ speaker_id: 'speaker-1', speaker_label: null });
    expect(payload[3]).toMatchObject({ speaker_id: 'speaker-1' });
  });

  it('keeps stage directions speakerless and unresolvable names as labels', () => {
    const payload = buildLinePayload({ lines }, ids);
    expect(payload[1]).toEqual({
      kind: 'stage',
      speaker_id: null,
      speaker_label: null,
      text: 'Everyone nods.',
    });
    expect(payload[3]).toMatchObject({ speaker_id: null, speaker_label: '???' });
  });

  it('omits an empty setup line', () => {
    expect(buildLinePayload({ context: '  ', lines }, ids)).toHaveLength(4);
  });
});

describe('entryToEditValues', () => {
  const entry = (kinds: Array<'line' | 'stage' | 'context'>): Entry =>
    makeEntry({
      status: 'pending',
      lines: kinds.map((kind, index) => ({
        id: `20000000-0000-4000-8000-00000000000${index}`,
        position: index + 1,
        kind,
        speaker:
          kind === 'line'
            ? { id: '30000000-0000-4000-8000-000000000001', name: 'Pat', slug: 'pat' }
            : null,
        speakerLabel: null,
        text: `text ${index}`,
      })),
    });

  it('moves a leading setup line into the setup field', () => {
    const values = entryToEditValues(entry(['context', 'line', 'stage']));
    expect(values.context).toBe('text 0');
    expect(values.lines).toEqual([
      { kind: 'line', speaker: 'Pat', speakerLabel: null, text: 'text 1' },
      { kind: 'stage', speaker: null, speakerLabel: null, text: 'text 2' },
    ]);
  });

  it('keeps later setup lines as setup lines', () => {
    const values = entryToEditValues(entry(['line', 'context']));
    expect(values.context).toBe('');
    expect(values.lines[1]).toEqual({
      kind: 'context',
      speaker: null,
      speakerLabel: null,
      text: 'text 1',
    });
  });
});

describe('editing an existing entry round-trips its lines', () => {
  const base = makeEntry({
    slug: 'college-1',
    saidOn: null,
    era: 'college',
    publishedAt: '2026-01-05T00:00:00+00:00',
    createdAt: '2026-01-05T00:00:00+00:00',
  });
  const line = (
    position: number,
    kind: 'line' | 'stage' | 'context',
    text: string,
    speaker: { name: string; slug: string } | null = null,
    speakerLabel: string | null = null,
  ) => ({
    id: `20000000-0000-4000-8000-00000000000${position}`,
    position,
    kind,
    speaker: speaker ? { id: `30000000-0000-4000-8000-00000000000${position}`, ...speaker } : null,
    speakerLabel,
    text,
  });

  /** Entry lines as the edit form would save them, through the edit schema. */
  function roundTrip(lines: Entry['lines']) {
    const parsed = entryEditSchema.parse(entryToEditValues({ ...base, lines }));
    const ids = new Map(
      lines.flatMap((l) => (l.speaker ? [[l.speaker.slug, l.speaker.id] as const] : [])),
    );
    return buildLinePayload(parsed, ids);
  }

  it('keeps group labels as labels without creating speakers', () => {
    const lines = [line(1, 'line', 'Yes', null, 'Everyone else (in unison)')];
    expect(speakerNamesBySlug(entryToEditValues({ ...base, lines }).lines).size).toBe(0);
    expect(roundTrip(lines)).toEqual([
      { kind: 'line', speaker_id: null, speaker_label: 'Everyone else (in unison)', text: 'Yes' },
    ]);
  });

  it('turns a changed group label into a speaker again', () => {
    const edit = entryToEditValues({
      ...base,
      lines: [line(1, 'line', 'Yes', null, 'Everyone else')],
    });
    const changed = [{ ...edit.lines[0]!, speaker: 'Pat' }];
    expect([...speakerNamesBySlug(changed)]).toEqual([['pat', 'Pat']]);
  });

  it('keeps speakerless spoken lines and multiple setup lines', () => {
    const speakerId = '30000000-0000-4000-8000-000000000005';
    const payload = roundTrip([
      line(1, 'context', 'Setup one'),
      line(2, 'line', 'Nobody said this'),
      line(3, 'context', 'Setup two'),
      line(4, 'stage', 'Everyone nods.'),
      line(5, 'line', 'Hi', { name: 'Pat', slug: 'pat' }),
    ]);
    expect(payload).toEqual([
      { kind: 'context', speaker_id: null, speaker_label: null, text: 'Setup one' },
      { kind: 'line', speaker_id: null, speaker_label: null, text: 'Nobody said this' },
      { kind: 'context', speaker_id: null, speaker_label: null, text: 'Setup two' },
      { kind: 'stage', speaker_id: null, speaker_label: null, text: 'Everyone nods.' },
      { kind: 'line', speaker_id: speakerId, speaker_label: null, text: 'Hi' },
    ]);
  });

  it('accepts lengths beyond the submission limits', () => {
    const long = 'x'.repeat(1500);
    const lines = Array.from({ length: 40 }, (_, i) =>
      line(i + 1, 'line', long, null, 'A'.repeat(100)),
    );
    const payload = roundTrip(lines);
    expect(payload).toHaveLength(40);
    expect(payload[0]).toMatchObject({ text: long, speaker_label: 'A'.repeat(100) });
  });

  it('still rejects an empty line text', () => {
    const edit = entryToEditValues({ ...base, lines: [line(1, 'stage', 'ok')] });
    const blank = { ...edit, lines: [{ ...edit.lines[0], text: ' ' }] };
    expect(entryEditSchema.safeParse(blank).success).toBe(false);
  });
});
