import type { Entry } from '@aaronisms/db/schemas';

/** A published modern-era entry with no lines; override whatever the test cares about. */
export function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    slug: '2026-01-05-1',
    saidOn: '2026-01-05',
    era: 'modern',
    status: 'published',
    imagePath: null,
    imageAlt: null,
    noPreview: false,
    publishedAt: null,
    createdAt: '2026-01-01T00:00:00+00:00',
    lines: [],
    ...overrides,
  };
}
