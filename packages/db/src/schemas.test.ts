import { describe, expect, it } from 'vitest';
import { newSubmissionSchema } from './schemas';

describe('newSubmissionSchema', () => {
  it('defaults the date to today and the line kind to line', () => {
    const parsed = newSubmissionSchema.parse({ lines: [{ speaker: 'Test Aaron', text: ' Hi ' }] });
    expect(parsed.saidOn).toBe(new Date().toISOString().slice(0, 10));
    expect(parsed.lines[0]).toEqual({ speaker: 'Test Aaron', text: 'Hi', kind: 'line' });
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
});
