import 'server-only';
import { unstable_cache } from 'next/cache';
import { ENTRIES_TAG } from '@/features/entries/queries';
import { createAnonClient } from '@/lib/supabase/server';

/** Names of speakers on published entries, for autocomplete. Refreshed when entries change. */
export const getSpeakerNames = unstable_cache(
  async (): Promise<string[]> => {
    const { data, error } = await createAnonClient().from('speakers').select('name').order('name');
    if (error) throw new Error(`Could not load speakers: ${error.message}`);
    return data.map((speaker) => speaker.name);
  },
  ['speakers', 'names'],
  { tags: [ENTRIES_TAG], revalidate: 3600 },
);
