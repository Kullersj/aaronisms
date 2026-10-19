'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { slugForSpeaker } from '@aaronisms/db/slug';
import { ENTRIES_TAG } from '@/features/entries/queries';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_NAME_LENGTH = 60;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function back(message: string): never {
  redirect(`/admin/speakers?message=${encodeURIComponent(message)}`);
}

export async function renameSpeaker(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = field(formData, 'name').trim();
  const slug = slugForSpeaker(name);
  if (!slug || name.length > MAX_NAME_LENGTH) back('Enter a name of up to 60 characters.');

  const speakerId = field(formData, 'speakerId');
  if (!z.uuid().safeParse(speakerId).success) back('That speaker no longer exists.');

  const { data, error } = await createAdminClient()
    .from('speakers')
    .update({ name, slug })
    .eq('id', speakerId)
    .select('id');
  if (error?.code === '23505')
    back(`Another speaker is already called ${name}. Merge them instead.`);
  if (error) throw new Error(`Could not rename the speaker: ${error.message}`);
  if (!data.length) back('That speaker no longer exists.');

  revalidateTag(ENTRIES_TAG, { expire: 0 });
  back(`Renamed to ${name}.`);
}

/** Moves every line to the chosen speaker, then deletes the one merged away. */
export async function mergeSpeakers(formData: FormData): Promise<void> {
  await requireAdmin();
  const from = field(formData, 'speakerId');
  const into = field(formData, 'into');
  if (!into || from === into) back('Choose a different speaker to merge into.');

  const { error } = await createAdminClient().rpc('merge_speakers', { p_from: from, p_into: into });
  if (error) throw new Error(`Could not merge the speakers: ${error.message}`);

  revalidateTag(ENTRIES_TAG, { expire: 0 });
  back('Merged.');
}
