'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { slugForSpeaker } from '@aaronisms/db/slug';
import { expireEntries } from '@/features/entries/queries';
import { adminMessageUrl, type AdminMessageCode } from '@/features/admin/messages';
import { requireAdmin } from '@/lib/auth';
import { field } from '@/lib/form';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_NAME_LENGTH = 60;

function back(code: AdminMessageCode): never {
  redirect(adminMessageUrl('/admin/speakers', code));
}

export async function renameSpeaker(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = field(formData, 'name').trim();
  const slug = slugForSpeaker(name);
  if (!slug || name.length > MAX_NAME_LENGTH) back('speaker-name-invalid');

  const speakerId = field(formData, 'speakerId');
  if (!z.uuid().safeParse(speakerId).success) back('speaker-missing');

  const { data, error } = await createAdminClient()
    .from('speakers')
    .update({ name, slug })
    .eq('id', speakerId)
    .select('id');
  if (error?.code === '23505') back('speaker-duplicate');
  if (error) throw new Error(`Could not rename the speaker: ${error.message}`);
  if (!data.length) back('speaker-missing');

  expireEntries();
  back('speaker-renamed');
}

/** Moves every line to the chosen speaker, then deletes the one merged away. */
export async function mergeSpeakers(formData: FormData): Promise<void> {
  await requireAdmin();
  const from = field(formData, 'speakerId');
  const into = field(formData, 'into');
  if (!into || from === into) back('merge-target-missing');

  const { error } = await createAdminClient().rpc('merge_speakers', { p_from: from, p_into: into });
  if (error) throw new Error(`Could not merge the speakers: ${error.message}`);

  expireEntries();
  back('speakers-merged');
}
