import { createClient } from '@supabase/supabase-js';
import type { Database } from '@aaronisms/db/database.types';
import { requireEnv, requireLocalSupabase } from './env';

/** Service-role client for test setup and assertions. Never used by the pages under test. */
export function serviceClient() {
  return createClient<Database>(requireLocalSupabase(), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

const ENTRY_COLUMNS =
  'id, slug, said_on, status, image_path, reviewed_by_email, decision_note, submitted_by, lines:entry_lines(position, kind, text, speaker_label, speaker:speakers(name))';

/** The entry a test submitted, found by the unique name it submitted with. */
export async function findEntry(submittedBy: string) {
  const { data, error } = await serviceClient()
    .from('entries')
    .select(ENTRY_COLUMNS)
    .eq('submitted_by', submittedBy)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data && { ...data, lines: [...data.lines].sort((a, b) => a.position - b.position) };
}

export async function tokensFor(entryId: string) {
  const { data, error } = await serviceClient()
    .from('moderation_tokens')
    .select('moderator_email, token_hash, expires_at, used_at')
    .eq('entry_id', entryId);
  if (error) throw new Error(error.message);
  return data;
}

/** Deletes the entries a test created, their photos and any speakers it made. */
export async function deleteTestData(submittedBy: string, speakerPrefix: string) {
  const client = serviceClient();
  const { data } = await client
    .from('entries')
    .select('id, image_path')
    .eq('submitted_by', submittedBy);
  const photos = (data ?? []).flatMap((entry) => (entry.image_path ? [entry.image_path] : []));
  // Photos under `private/` are in the private bucket; all others are in the public one.
  const isPrivate = (path: string) => path.startsWith('private/');
  const publicPhotos = photos.filter((path) => !isPrivate(path));
  const privatePhotos = photos.filter(isPrivate);
  if (publicPhotos.length > 0) await client.storage.from('aaronism-images').remove(publicPhotos);
  if (privatePhotos.length > 0) {
    await client.storage.from('aaronism-images-private').remove(privatePhotos);
  }
  await client.from('entries').delete().eq('submitted_by', submittedBy);
  await client.from('speakers').delete().like('name', `${speakerPrefix}%`);
}
