import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Entry } from '@aaronisms/db/schemas';
import { ENTRIES_TAG, ENTRY_COLUMNS } from '@/features/entries/queries';
import { toEntry, type EntryRow } from '@/features/entries/mappers';
import { compareEntries } from '@/features/entries/utils';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAnonClient } from '@/lib/supabase/server';

export type SpeakerSummary = { id: string; name: string; lineCount: number };

/** Every speaker with the number of lines they have, for the admin. Service role. */
export async function getSpeakerSummaries(): Promise<SpeakerSummary[]> {
  const { data, error } = await createAdminClient()
    .from('speakers')
    .select('id, name, lines:entry_lines(count)')
    .order('name');
  if (error) throw new Error(`Could not load speakers: ${error.message}`);
  return data.map((speaker) => ({
    id: speaker.id,
    name: speaker.name,
    lineCount: speaker.lines[0]?.count ?? 0,
  }));
}

export type PublicSpeaker = {
  id: string;
  name: string;
  slug: string;
  lineCount: number;
  points: number;
};

const cacheOptions = { tags: [ENTRIES_TAG], revalidate: 3600 };

/**
 * Speakers with at least one line in a published entry, with their line counts and points, by name.
 * Anon client: RLS only lets it see lines of published entries, so the counts are public ones.
 */
export async function fetchPublicSpeakers(): Promise<PublicSpeaker[]> {
  const client = createAnonClient();
  const [speakers, scores] = await Promise.all([
    client.from('speakers').select('id, name, slug, lines:entry_lines(count)').order('name'),
    client.from('speaker_points').select('speaker_id, points'),
  ]);
  if (speakers.error) throw new Error(`Could not load speakers: ${speakers.error.message}`);
  if (scores.error) throw new Error(`Could not load speaker points: ${scores.error.message}`);
  const points = new Map(scores.data.map((score) => [score.speaker_id, score.points]));
  return speakers.data
    .map(({ lines, ...speaker }) => ({
      ...speaker,
      lineCount: lines[0]?.count ?? 0,
      points: points.get(speaker.id) ?? 0,
    }))
    .filter((speaker) => speaker.lineCount > 0);
}

export const getPublicSpeakers = unstable_cache(
  fetchPublicSpeakers,
  ['speakers', 'public'],
  cacheOptions,
);

export type SpeakerPage = { speaker: Omit<PublicSpeaker, 'points'>; entries: Entry[] };

/**
 * One speaker with every published entry they have a line in, newest first. Null when the
 * speaker does not exist or has nothing published.
 */
export async function fetchSpeakerPage(slug: string): Promise<SpeakerPage | null> {
  const client = createAnonClient();
  const { data: speaker, error } = await client
    .from('speakers')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Could not load speaker: ${error.message}`);
  if (!speaker) return null;

  // `mine` is a second embed of entry_lines: !inner keeps only entries this speaker spoke in,
  // while `lines` still returns every line of those entries.
  const { data, error: entriesError } = await client
    .from('entries')
    .select(`${ENTRY_COLUMNS}, mine:entry_lines!inner(speaker_id)`)
    .eq('status', 'published')
    .eq('mine.speaker_id', speaker.id);
  if (entriesError) throw new Error(`Could not load entries: ${entriesError.message}`);

  const entries = (data satisfies EntryRow[]).map(toEntry).sort(compareEntries);
  const lineCount = entries.reduce(
    (total, entry) => total + entry.lines.filter((line) => line.speaker?.id === speaker.id).length,
    0,
  );
  if (lineCount === 0) return null;
  return { speaker: { ...speaker, lineCount }, entries };
}

export const getSpeakerPage = unstable_cache(fetchSpeakerPage, ['speakers', 'page'], cacheOptions);
