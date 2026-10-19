import { describe, expect, it } from 'vitest';
import type { Entry } from '@aaronisms/db/schemas';
import {
  buildLinePayload,
  entryToEditValues,
  speakerNamesBySlug,
} from '@/features/submissions/lines';

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
  const entry = (kinds: Array<'line' | 'stage' | 'context'>): Entry => ({
    id: '10000000-0000-4000-8000-000000000001',
    slug: '2026-01-05-1',
    saidOn: '2026-01-05',
    era: 'modern',
    status: 'pending',
    imagePath: null,
    imageAlt: null,
    publishedAt: null,
    createdAt: '2026-01-05T00:00:00+00:00',
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
      { kind: 'line', speaker: 'Pat', text: 'text 1' },
      { kind: 'stage', speaker: null, text: 'text 2' },
    ]);
  });

  it('turns later setup lines into stage directions', () => {
    const values = entryToEditValues(entry(['line', 'context']));
    expect(values.context).toBe('');
    expect(values.lines[1]).toEqual({ kind: 'stage', speaker: null, text: 'text 1' });
  });
});
