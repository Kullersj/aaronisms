import { describe, expect, it } from 'vitest';
import { dateFromTimestamp, rowToSubmission } from './form-responses';

const row = (what: string, extra: Record<string, string> = {}) => ({
  Timestamp: '10/18/2026 14:05:33',
  'Who said it?': 'Test Aaron',
  'What was said?': what,
  'Your name': 'Pat',
  ...extra,
});

describe('dateFromTimestamp', () => {
  it('reads US sheet timestamps and ISO strings', () => {
    expect(dateFromTimestamp('10/18/2026 14:05:33')).toBe('2026-10-18');
    expect(dateFromTimestamp('1/5/2026')).toBe('2026-01-05');
    expect(dateFromTimestamp('2026-10-18T14:05:33Z')).toBe('2026-10-18');
  });

  it('rejects junk and impossible dates', () => {
    expect(dateFromTimestamp('yesterday')).toBeNull();
    expect(dateFromTimestamp('2/30/2026')).toBeNull();
  });
});

describe('rowToSubmission', () => {
  it('makes a single line spoken by the "Who said it?" person', () => {
    expect(rowToSubmission(row('Toasters are just tiny suns.'))).toEqual({
      saidOn: '2026-10-18',
      submittedBy: 'Pat',
      lines: [
        { position: 1, kind: 'line', speaker: 'Test Aaron', text: 'Toasters are just tiny suns.' },
      ],
    });
  });

  it('keeps a lone "Name: text" as a single line for the form speaker', () => {
    const result = rowToSubmission(row('Note: this is a quote about notes.'));
    expect(result?.lines).toHaveLength(1);
    expect(result?.lines[0]?.speaker).toBe('Test Aaron');
  });

  it('splits "Name: text" lines into a dialogue with context lines', () => {
    const result = rowToSubmission(
      row('At the park:\r\nPat: Is that a duck?\nSam: It is a goose.\nWow, honk.'),
    );
    expect(result?.lines).toEqual([
      { position: 1, kind: 'context', speaker: null, text: 'At the park:' },
      { position: 2, kind: 'line', speaker: 'Pat', text: 'Is that a duck?' },
      { position: 3, kind: 'line', speaker: 'Sam', text: 'It is a goose.' },
      { position: 4, kind: 'line', speaker: 'Test Aaron', text: 'Wow, honk.' },
    ]);
  });

  it('allows a missing speaker and submitter name', () => {
    const result = rowToSubmission(row('Hmm.', { 'Who said it?': '', 'Your name': ' ' }));
    expect(result?.lines[0]?.speaker).toBeNull();
    expect(result?.submittedBy).toBeNull();
  });

  it('skips rows without text or a usable timestamp', () => {
    expect(rowToSubmission(row('   '))).toBeNull();
    expect(rowToSubmission(row('Hi', { Timestamp: '' }))).toBeNull();
  });

  it('honours custom column names', () => {
    const result = rowToSubmission(
      { When: '2026-01-02', Speaker: 'Pat', Quote: 'Hello.' },
      { timestamp: 'When', who: 'Speaker', what: 'Quote', name: 'Sender' },
    );
    expect(result?.saidOn).toBe('2026-01-02');
    expect(result?.lines[0]?.speaker).toBe('Pat');
  });
});
