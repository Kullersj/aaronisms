'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { ENTRIES_TAG } from '@/features/entries/queries';
import { decideAsAdmin } from '@/features/moderation/decisions';
import { getEntryForReview } from '@/features/moderation/queries';
import { imageExtension, sniffImageType } from '@/features/submissions/image';
import { buildLinePayload } from '@/features/submissions/lines';
import { resolveSpeakerIds } from '@/features/submissions/speakers';
import { requireAdmin } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSessionClient } from '@/lib/supabase/session';
import { IMAGE_BUCKET } from '@/lib/supabase/storage';
import { adminEntrySchema } from './schema';

export type LoginState = { message: string } | null;
export type SaveResult = { ok: true } | { ok: false; message: string };

const MAX_NOTE_LENGTH = 500;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

/**
 * Emails a magic link, but only to the default moderator. The reply is the same for everyone so
 * the form does not reveal who the admin is.
 */
export async function requestMagicLink(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = field(formData, 'email').trim().toLowerCase();
  const env = getServerEnv();
  if (!(await checkRateLimit(RATE_LIMITS.login, getClientIp(await headers())))) {
    return { message: 'Too many attempts. Please try again later.' };
  }
  if (email === env.defaultModerator) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${env.siteUrl}/auth/callback` },
    });
    if (error) return { message: 'We could not send the link. Please try again.' };
  }
  return { message: 'If that address can sign in, a link is on its way. Check your email.' };
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  // This device only; other signed-in browsers keep their session.
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/admin/login');
}

export async function approveEntryAsAdmin(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await decideAsAdmin(field(formData, 'entryId'), admin.email, { kind: 'approve' });
  redirect('/admin');
}

export async function rejectEntryAsAdmin(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const note = field(formData, 'note').trim().slice(0, MAX_NOTE_LENGTH);
  await decideAsAdmin(field(formData, 'entryId'), admin.email, {
    kind: 'reject',
    note: note || undefined,
  });
  redirect('/admin');
}

/** Stores a replacement photo and returns its path, or null if it is not a supported image. */
async function uploadReplacement(entryId: string, image: File): Promise<string | null> {
  const bytes = new Uint8Array(await image.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return null;
  const path = `entries/${entryId}-${crypto.randomUUID().slice(0, 8)}.${imageExtension(type)}`;
  const { error } = await createAdminClient()
    .storage.from(IMAGE_BUCKET)
    .upload(path, bytes, { contentType: type });
  if (error) throw new Error(`Could not store the photo: ${error.message}`);
  return path;
}

/**
 * Saves an admin's edits to any entry: date, lines, photo, alt text and, for decided entries,
 * status. For a pending entry the "approve" intent saves and publishes in one transaction.
 */
export async function saveEntry(entryId: string, formData: FormData): Promise<SaveResult> {
  const admin = await requireAdmin();
  let payload: unknown;
  try {
    payload = JSON.parse(field(formData, 'payload'));
  } catch {
    payload = null;
  }
  const parsed = adminEntrySchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: 'Please check the form and try again.' };
  const { edit, status, imageAlt, removeImage, intent } = parsed.data;

  const current = await getEntryForReview(entryId);
  if (!current) return { ok: false, message: 'That entry no longer exists.' };

  const client = createAdminClient();
  const upload = formData.get('image');
  let imagePath = removeImage ? null : current.imagePath;
  if (upload instanceof File && upload.size > 0) {
    imagePath = await uploadReplacement(entryId, upload);
    if (!imagePath) return { ok: false, message: 'That file is not a supported image.' };
  }
  const imageUpdate = await client
    .from('entries')
    .update({ image_path: imagePath, image_alt: imageAlt || null })
    .eq('id', entryId);
  if (imageUpdate.error) throw new Error(`Could not save the photo: ${imageUpdate.error.message}`);
  if (current.imagePath && current.imagePath !== imagePath) {
    await client.storage.from(IMAGE_BUCKET).remove([current.imagePath]);
  }

  if (current.status === 'pending' && intent === 'approve') {
    await decideAsAdmin(entryId, admin.email, { kind: 'approve' }, edit);
  } else {
    const speakerIds = await resolveSpeakerIds(client, edit.lines);
    const { error } = await client.rpc('apply_entry_edits', {
      p_entry_id: entryId,
      p_said_on: edit.saidOn ?? undefined,
      p_lines: buildLinePayload(edit, speakerIds),
    });
    if (error) throw new Error(`Could not save the entry: ${error.message}`);
    if (current.status !== 'pending' && status !== current.status) {
      const { error: statusError } = await client
        .from('entries')
        .update({
          status,
          reviewed_by_email: admin.email,
          published_at:
            status === 'published' ? (current.publishedAt ?? new Date().toISOString()) : null,
        })
        .eq('id', entryId);
      if (statusError) throw new Error(`Could not change the status: ${statusError.message}`);
    }
  }

  revalidateTag(ENTRIES_TAG, { expire: 0 });
  return { ok: true };
}
