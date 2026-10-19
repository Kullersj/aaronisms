import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Entry } from '@aaronisms/db/schemas';
import { createAnonClient } from '@/lib/supabase/server';
import { toEntry, type EntryRow } from './mappers';
import { compareEntries } from './utils';

export const ENTRIES_TAG = 'entries';

// The anon role cannot `select *` from entries (private columns), so list columns explicitly.
const ENTRY_COLUMNS =
  'id, slug, said_on, era, status, image_path, image_alt, submitted_by, published_at, created_at, lines:entry_lines(id, position, kind, speaker_label, text, speaker:speakers(id, name, slug))';

const cacheOptions = { tags: [ENTRIES_TAG], revalidate: 3600 };

async function fetchEntries(era: 'modern' | 'college'): Promise<Entry[]> {
  const { data, error } = await createAnonClient()
    .from('entries')
    .select(ENTRY_COLUMNS)
    .eq('status', 'published')
    .eq('era', era)
    .order('said_on', { ascending: false, nullsFirst: false })
    .order('slug', { ascending: true });
  if (error) throw new Error(`Could not load entries: ${error.message}`);
  return (data satisfies EntryRow[]).map(toEntry).sort(compareEntries);
}

/** Published modern-era entries, newest first, with lines and speakers. */
export const getPublishedEntries = unstable_cache(
  () => fetchEntries('modern'),
  ['entries', 'published'],
  cacheOptions,
);

/** Published College Years entries (undated), in slug order. */
export const getCollegeEntries = unstable_cache(
  () => fetchEntries('college'),
  ['entries', 'college'],
  cacheOptions,
);

/** One published entry by slug, or null when there is none. */
export const getEntryBySlug = unstable_cache(
  async (slug: string): Promise<Entry | null> => {
    const { data, error } = await createAnonClient()
      .from('entries')
      .select(ENTRY_COLUMNS)
      .eq('status', 'published')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(`Could not load entry: ${error.message}`);
    return data ? toEntry(data satisfies EntryRow) : null;
  },
  ['entries', 'by-slug'],
  cacheOptions,
);
