import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import type { Entry } from '@aaronisms/db/schemas';
import { createAnonClient } from '@/lib/supabase/server';
import { toEntry, type EntryRow } from './mappers';
import { compareEntries } from './utils';

export const ENTRIES_TAG = 'entries';

/** Drops the cached public data at once, rather than after the hour it would otherwise live. */
export function expireEntries(): void {
  revalidateTag(ENTRIES_TAG, { expire: 0 });
}

// The anon role cannot `select *` from entries (private columns), so list columns explicitly.
export const ENTRY_COLUMNS =
  'id, slug, said_on, era, status, image_path, image_alt, no_preview, published_at, created_at, lines:entry_lines(id, position, kind, speaker_label, text, speaker:speakers(id, name, slug))';

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

/** One published entry by slug, uncached. Anything not published is invisible to the anon role. */
export async function fetchEntryBySlug(slug: string): Promise<Entry | null> {
  const { data, error } = await createAnonClient()
    .from('entries')
    .select(ENTRY_COLUMNS)
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Could not load entry: ${error.message}`);
  return data ? toEntry(data satisfies EntryRow) : null;
}

/** One published entry by slug, or null when there is none. */
export const getEntryBySlug = unstable_cache(
  fetchEntryBySlug,
  ['entries', 'by-slug'],
  cacheOptions,
);

/** Published entries with the given ids, in the order of `ids`. Unknown or unpublished ids are skipped. */
export async function fetchEntriesByIds(ids: string[]): Promise<Entry[]> {
  if (ids.length === 0) return [];
  const { data, error } = await createAnonClient()
    .from('entries')
    .select(ENTRY_COLUMNS)
    .eq('status', 'published')
    .in('id', ids);
  if (error) throw new Error(`Could not load entries: ${error.message}`);
  const byId = new Map((data satisfies EntryRow[]).map((row) => [row.id, toEntry(row)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

/**
 * The slug of a random published entry other than `exclude`, or null when nothing is published.
 * Returns `exclude` itself only when it is the sole published entry. Never cached.
 */
export async function fetchRandomEntrySlug(exclude?: string): Promise<string | null> {
  const client = createAnonClient();
  const { data, error } = await client.rpc('random_published_entry_slug');
  if (error) throw new Error(`Could not pick a random entry: ${error.message}`);
  // The function returns null when nothing is published, which the generated type does not show.
  const slug = (data as string | null) ?? null;
  if (!exclude || slug !== exclude) return slug;

  // Picked the entry the visitor is already on: pick again among the others. One query, so
  // entries published or unpublished meanwhile cannot leave it with nothing to pick.
  const { data: others, error: othersError } = await client
    .from('entries')
    .select('slug')
    .eq('status', 'published')
    .neq('slug', exclude);
  if (othersError) throw new Error(`Could not pick a random entry: ${othersError.message}`);
  if (!others.length) return slug;
  return others[Math.floor(Math.random() * others.length)]?.slug ?? slug;
}
