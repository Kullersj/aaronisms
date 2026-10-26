'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { expireEntries } from '@/features/entries/queries';
import { decideAsAdmin, type DecisionOutcome } from '@/features/moderation/decisions';
import { getEntryForReview } from '@/features/moderation/queries';
import { buildLinePayload } from '@/features/submissions/lines';
import { resolveSpeakerIds } from '@/features/submissions/speakers';
import { requireAdmin } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';
import { field, jsonField, noteField } from '@/lib/form';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { movePhoto, removePhoto, storePhoto } from '@/lib/supabase/photos';
import { createSessionClient } from '@/lib/supabase/session';
import { adminMessageUrl } from './messages';
import { adminEntrySchema } from './schema';

export type LoginState = { message: string } | null;
export type SaveResult = { ok: true } | { ok: false; message: string };

const STALE_MESSAGE = 'This entry was changed by someone else; reload and try again.';

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

/** Back to the queue, saying so when the decision did not apply. */
function queueUrl(outcome: DecisionOutcome): string {
  if (outcome === 'decided') return '/admin';
  return adminMessageUrl('/admin', 'already-decided');
}

export async function approveEntryAsAdmin(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const outcome = await decideAsAdmin(field(formData, 'entryId'), admin.email, {
    kind: 'approve',
  });
  redirect(queueUrl(outcome));
}

export async function rejectEntryAsAdmin(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const note = noteField(formData);
  const outcome = await decideAsAdmin(field(formData, 'entryId'), admin.email, {
    kind: 'reject',
    note: note || undefined,
  });
  redirect(queueUrl(outcome));
}

/**
 * Saves an admin's edits to any entry: date, lines, photo, alt text and, for decided entries,
 * status. For a pending entry the "approve" intent saves and publishes in one transaction.
 */
export async function saveEntry(entryId: string, formData: FormData): Promise<SaveResult> {
  const admin = await requireAdmin();
  const parsed = adminEntrySchema.safeParse(jsonField(formData));
  if (!parsed.success) return { ok: false, message: 'Please check the form and try again.' };
  const { edit, status, expectedStatus, imageAlt, submittedBy, removeImage, intent } = parsed.data;

  const current = await getEntryForReview(entryId);
  if (!current) return { ok: false, message: 'That entry no longer exists.' };
  // A form opened before someone else decided the entry must not overwrite that decision.
  if (current.status !== expectedStatus) {
    return { ok: false, message: STALE_MESSAGE };
  }

  const client = createAdminClient();
  const upload = formData.get('image');
  let uploaded: string | null = null;
  let imagePath = removeImage ? null : current.imagePath;
  if (upload instanceof File && upload.size > 0) {
    // Only a published entry's photo is public; any other status keeps it private.
    uploaded = await storePhoto(upload, current.status === 'published' ? 'public' : 'private');
    if (!uploaded) return { ok: false, message: 'That file is not a supported image.' };
    imagePath = uploaded;
  }
  // Puts the photo and submitter columns back and drops the new file; used when the save fails
  // after them.
  const undoImage = async () => {
    await client
      .from('entries')
      .update({
        image_path: current.imagePath,
        image_alt: current.imageAlt,
        submitted_by: current.submittedBy,
      })
      .eq('id', entryId);
    await removePhoto(uploaded);
  };
  const imageUpdate = await client
    .from('entries')
    .update({
      image_path: imagePath,
      image_alt: imageAlt || null,
      submitted_by: submittedBy || null,
    })
    .eq('id', entryId);
  if (imageUpdate.error) {
    await removePhoto(uploaded);
    throw new Error(`Could not save the photo: ${imageUpdate.error.message}`);
  }

  let photoMove: 'public' | 'private' | null = null;
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
      if (current.status !== 'pending' && status !== expectedStatus) {
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
        photoMove = status === 'published' ? 'public' : 'private';
      }
    }
  } catch (error) {
    await undoImage();
    throw error;
  }
  // The entry is saved; now delete a replaced or removed photo, and put the photo where the new
  // status wants it (public only while published). Neither can fail the save, so they only log.
  if (current.imagePath && current.imagePath !== imagePath) await removePhoto(current.imagePath);
  if (photoMove) await movePhoto(entryId, imagePath, photoMove);

  expireEntries();
  return { ok: true };
}

/**
 * Deletes an entry softly: it comes off the site but keeps its lines and photo (moved to the
 * private bucket), so it can be restored by setting another status on its edit page.
 */
export async function deleteEntry(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const entryId = field(formData, 'entryId');
  if (!z.uuid().safeParse(entryId).success) redirect('/admin/entries');
  const client = createAdminClient();
  const { error } = await client.rpc('delete_entry', {
    p_entry_id: entryId,
    p_admin_email: admin.email,
  });
  if (error?.code === 'P0002') {
    redirect(adminMessageUrl('/admin/entries', 'entry-already-deleted'));
  }
  if (error) throw new Error(`Could not delete the entry: ${error.message}`);
  const { data } = await client
    .from('entries')
    .select('image_path')
    .eq('id', entryId)
    .maybeSingle();
  await movePhoto(entryId, data?.image_path ?? null, 'private');
  expireEntries();
  redirect(adminMessageUrl('/admin/entries', 'entry-deleted'));
}
