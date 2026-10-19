import { describe, expect, it } from 'vitest';
import { toEntry, type EntryRow } from '@/features/entries/mappers';
import { toMeme } from '@/features/memes/mappers';
import { buildImageUrl } from '@/lib/supabase/storage';

const row: EntryRow = {
  id: '10000000-0000-4000-8000-000000000002',
  slug: '2026-01-05-2',
  said_on: '2026-01-05',
  era: 'modern',
  status: 'published',
  image_path: null,
  image_alt: null,
  submitted_by: 'Pat',
  published_at: '2026-01-06T12:05:00+00:00',
  created_at: '2026-01-06T11:00:00.123456+00:00',
  lines: [
    {
      id: '30000000-0000-4000-8000-000000000002',
      position: 2,
      kind: 'line',
      speaker_label: null,
      text: 'Second',
      speaker: {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Test Aaron',
        slug: 'test-aaron',
      },
    },
    {
      id: '30000000-0000-4000-8000-000000000001',
      position: 1,
      kind: 'context',
      speaker_label: null,
      text: 'First:',
      speaker: null,
    },
  ],
};

describe('toEntry', () => {
  it('maps snake_case to camelCase and orders lines by position', () => {
    const entry = toEntry(row);
    expect(entry.saidOn).toBe('2026-01-05');
    expect(entry.submittedBy).toBe('Pat');
    expect(entry.lines.map((l) => l.text)).toEqual(['First:', 'Second']);
    expect(entry.lines[1]?.speaker?.name).toBe('Test Aaron');
  });

  it('rejects malformed rows', () => {
    expect(() => toEntry({ ...row, said_on: 'yesterday' })).toThrow();
  });
});

describe('toMeme', () => {
  it('maps a meme row', () => {
    const meme = toMeme({
      id: '20000000-0000-4000-8000-000000000001',
      image_path: 'memes/a.png',
      caption: null,
      created_at: '2026-01-06T12:00:00+00:00',
    });
    expect(meme).toMatchObject({ imagePath: 'memes/a.png', caption: null });
  });
});

describe('buildImageUrl', () => {
  it('builds a public bucket URL and encodes segments', () => {
    expect(buildImageUrl('http://127.0.0.1:54321/', 'entries/a b.png')).toBe(
      'http://127.0.0.1:54321/storage/v1/object/public/aaronism-images/entries/a%20b.png',
    );
  });
});
