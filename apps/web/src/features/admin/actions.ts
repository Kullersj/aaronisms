'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
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
 * Emails a magic link, but only to a moderator (an address in MODERATOR_EMAILS). The reply is the
 * same for everyone so the form does not reveal who the moderators are.
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
  if (env.isModerator(email)) {
    // Sign-up is off, so a moderator's account is created here, with the service role.
    const created = await createAdminClient().auth.admin.createUser({ email, email_confirm: true });
    if (created.error && created.error.code !== 'email_exists') {
      console.error('Could not create the moderator account', created.error);
      return { message: 'We could not send the link. Please try again.' };
    }
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${env.siteUrl}/auth/callback`, shouldCreateUser: false },
    });
    // Supabase limits how often it sends auth email; say so rather than suggest an instant retry.
    if (error?.code === 'over_email_send_rate_limit') {
      return { message: 'Too many sign-in emails were sent recently. Please try again later.' };
    }
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
  let uploaded: string | null = null;
  let imagePath = removeImage ? null : current.imagePath;
  if (upload instanceof File && upload.size > 0) {
    uploaded = await uploadReplacement(entryId, upload);
    if (!uploaded) return { ok: false, message: 'That file is not a supported image.' };
    imagePath = uploaded;
  }
  // Puts the photo columns back and drops the new file; used when the save fails after the photo.
  const undoImage = async () => {
    await client
      .from('entries')
      .update({ image_path: current.imagePath, image_alt: current.imageAlt })
      .eq('id', entryId);
    if (uploaded) await client.storage.from(IMAGE_BUCKET).remove([uploaded]);
  };
  const imageUpdate = await client
    .from('entries')
    .update({ image_path: imagePath, image_alt: imageAlt || null })
    .eq('id', entryId);
  if (imageUpdate.error) {
    if (uploaded) await client.storage.from(IMAGE_BUCKET).remove([uploaded]);
    throw new Error(`Could not save the photo: ${imageUpdate.error.message}`);
  }

  try {
    if (current.status === 'pending' && intent === 'approve') {
      const outcome = await decideAsAdmin(entryId, admin.email, { kind: 'approve' }, edit);
      if (outcome !== 'decided') {
        await undoImage();
        return {
          ok: false,
          message: 'Someone else already decided this entry, so nothing was saved.',
        };
      }
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
  } catch (error) {
    await undoImage();
    throw error;
  }
  // Only now that the entry is saved is the old photo safe to delete.
  if (current.imagePath && current.imagePath !== imagePath) {
    await client.storage.from(IMAGE_BUCKET).remove([current.imagePath]);
  }

  revalidateTag(ENTRIES_TAG, { expire: 0 });
  return { ok: true };
}

/**
 * Deletes an entry for good, with its lines and photo, and takes it off the site. There is no
 * undo; to hide an entry but keep it, set its status to rejected instead.
 */
export async function deleteEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const entryId = field(formData, 'entryId');
  if (!z.uuid().safeParse(entryId).success) redirect('/admin/entries');
  const client = createAdminClient();
  const { data: imagePath, error } = await client.rpc('delete_entry', { p_entry_id: entryId });
  if (error?.code === 'P0002') {
    redirect(`/admin/entries?message=${encodeURIComponent('That entry was already deleted.')}`);
  }
  if (error) throw new Error(`Could not delete the entry: ${error.message}`);
  if (imagePath) {
    const removed = await client.storage.from(IMAGE_BUCKET).remove([imagePath]);
    // The entry is already gone, so a photo left behind is only wasted space; do not fail for it.
    if (removed.error) console.error("Could not remove the deleted entry's photo", removed.error);
  }
  revalidateTag(ENTRIES_TAG, { expire: 0 });
  redirect(`/admin/entries?message=${encodeURIComponent('Entry deleted.')}`);
}
