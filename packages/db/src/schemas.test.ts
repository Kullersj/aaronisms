import { describe, expect, it } from 'vitest';
import { entryEditSchema, memeSchema, newSubmissionSchema } from './schemas';

describe('newSubmissionSchema', () => {
  it('defaults the date to today and the line kind to line', () => {
    const parsed = newSubmissionSchema.parse({ lines: [{ speaker: 'Test Aaron', text: ' Hi ' }] });
    expect(parsed.saidOn).toBe(new Date().toISOString().slice(0, 10));
    expect(parsed.lines[0]).toEqual({ speaker: 'Test Aaron', text: 'Hi', kind: 'line' });
  });

  it('accepts dates from 1990 to tomorrow (UTC) only', () => {
    const lines = [{ speaker: 'A', text: 'B' }];
    const on = (offsetDays: number) =>
      new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const ok = (saidOn: string) => newSubmissionSchema.safeParse({ lines, saidOn }).success;
    expect(ok('1990-01-01')).toBe(true);
    expect(ok('1989-12-31')).toBe(false);
    expect(ok('0001-01-01')).toBe(false);
    expect(ok(on(0))).toBe(true);
    expect(ok(on(1))).toBe(true);
    expect(ok(on(2))).toBe(false);
    expect(ok('9999-12-31')).toBe(false);
  });

  it('requires at least one line', () => {
    expect(newSubmissionSchema.safeParse({ lines: [] }).success).toBe(false);
  });

  it('requires a speaker for spoken lines only', () => {
    const stage = { speaker: null, text: 'Gasps.', kind: 'stage' };
    expect(newSubmissionSchema.safeParse({ lines: [stage] }).success).toBe(true);
    expect(
      newSubmissionSchema.safeParse({ lines: [{ speaker: null, text: 'Hi', kind: 'line' }] })
        .success,
    ).toBe(false);
  });

  it('limits the submitter name and checks the image', () => {
    const lines = [{ speaker: 'A', text: 'B' }];
    expect(newSubmissionSchema.safeParse({ lines, submittedBy: 'x'.repeat(81) }).success).toBe(
      false,
    );
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    expect(newSubmissionSchema.safeParse({ lines, image: pdf }).success).toBe(false);
    const png = new File(['x'], 'a.png', { type: 'image/png' });
    expect(newSubmissionSchema.safeParse({ lines, image: png }).success).toBe(true);
  });

  it('treats an empty file input as no image', () => {
    const lines = [{ speaker: 'A', text: 'B' }];
    const empty = new File([], '', { type: 'application/octet-stream' });
    const result = newSubmissionSchema.safeParse({ lines, image: empty });
    expect(result.success).toBe(true);
    expect(result.data?.image).toBeUndefined();
  });
});

describe('entryEditSchema', () => {
  const lines = [{ speaker: 'Test Aaron', text: 'Hi', kind: 'line' }];

  it('needs an explicit date, which may be null for undated entries', () => {
    expect(entryEditSchema.safeParse({ lines }).success).toBe(false);
    expect(entryEditSchema.safeParse({ saidOn: null, lines }).success).toBe(true);
    expect(entryEditSchema.safeParse({ saidOn: '2026-10-12', lines }).success).toBe(true);
    expect(entryEditSchema.safeParse({ saidOn: '12/10/2026', lines }).success).toBe(false);
  });

  it('needs a line with text, but keeps imported shapes a submission would refuse', () => {
    expect(entryEditSchema.safeParse({ saidOn: null, lines: [] }).success).toBe(false);
    const empty = [{ speaker: 'Test Aaron', text: ' ', kind: 'line' }];
    expect(entryEditSchema.safeParse({ saidOn: null, lines: empty }).success).toBe(false);
    // Imported entries can have spoken lines with no speaker and lines longer than a submission allows.
    const nobody = [{ speaker: null, text: 'Hi', kind: 'line' }];
    expect(entryEditSchema.safeParse({ saidOn: null, lines: nobody }).success).toBe(true);
    const long = [{ speaker: 'Test Aaron', text: 'a'.repeat(5000), kind: 'line' }];
    expect(entryEditSchema.safeParse({ saidOn: null, lines: long }).success).toBe(true);
  });
});

describe('memeSchema', () => {
  it('accepts a meme with or without a caption', () => {
    const base = {
      id: '20000000-0000-4000-8000-000000000001',
      imagePath: 'memes/a.png',
      createdAt: '2026-01-06T12:00:00+00:00',
    };
    expect(memeSchema.safeParse({ ...base, caption: null }).success).toBe(true);
    expect(memeSchema.safeParse({ ...base, caption: 'Hi' }).success).toBe(true);
    expect(memeSchema.safeParse({ ...base, imagePath: '', caption: null }).success).toBe(false);
  });
});
