import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@aaronisms/db/database.types';
import { speakerNamesBySlug } from './lines';

/**
 * Finds or creates the speaker for each name in the lines, matched by slug. Returns slug to id.
 * New speakers stay invisible to the public until they appear in a published entry.
 */
export async function resolveSpeakerIds(
  client: SupabaseClient<Database>,
  lines: Parameters<typeof speakerNamesBySlug>[0],
): Promise<Map<string, string>> {
  const names = speakerNamesBySlug(lines);
  if (names.size === 0) return new Map();

  const rows = [...names].map(([slug, name]) => ({ slug, name }));
  // An existing speaker with the same slug wins. Two submissions adding the same new speaker at once
  // can still trip the unique name (ON CONFLICT only waits on the slug index), so retry once: by
  // then the other row is committed and the slug conflict ignores it.
  const upsert = () =>
    client.from('speakers').upsert(rows, { onConflict: 'slug', ignoreDuplicates: true });
  let insert = await upsert();
  if (insert.error?.code === '23505') insert = await upsert();
  if (insert.error) throw new Error(`Could not save speakers: ${insert.error.message}`);

  const found = await client
    .from('speakers')
    .select('id, slug')
    .in('slug', [...names.keys()]);
  if (found.error) throw new Error(`Could not load speakers: ${found.error.message}`);
  return new Map(found.data.map((speaker) => [speaker.slug, speaker.id]));
}
