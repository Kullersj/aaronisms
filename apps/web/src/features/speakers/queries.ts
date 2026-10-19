import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

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
