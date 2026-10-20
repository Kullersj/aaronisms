'use server';

import { after } from 'next/server';
import { headers } from 'next/headers';
import { HONEYPOT_FIELD, newSubmissionSchema, type NewSubmission } from '@aaronisms/db/schemas';
import { createModerationTokens } from '@/features/moderation/tokens';
import { alertDefaultModerator, notifyModerators } from '@/features/moderation/notify';
import { getEntryForReview } from '@/features/moderation/queries';
import { getServerEnv } from '@/lib/env';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { removePhoto, storePhoto } from '@/lib/supabase/photos';
import { verifyTurnstile } from '@/lib/turnstile';
import { buildLinePayload } from './lines';
import { resolveSpeakerIds } from './speakers';

export type SubmitResult = { ok: true } | { ok: false; message: string };

const fail = (message: string): SubmitResult => ({ ok: false, message });

/** Reads the form payload: JSON fields plus the optional photo. */
function parseSubmission(formData: FormData) {
  const payload = formData.get('payload');
  const image = formData.get('image');
  let fields: unknown;
  try {
    fields = typeof payload === 'string' ? JSON.parse(payload) : null;
  } catch {
    fields = null;
  }
  const hasImage = image instanceof File && image.size > 0;
  return newSubmissionSchema.safeParse({
    ...(typeof fields === 'object' ? fields : null),
    image: hasImage ? image : undefined,
  });
}

async function saveSubmission(submission: NewSubmission, ip: string | null) {
  const env = getServerEnv();
  const admin = createAdminClient();
  const entryId = crypto.randomUUID();
  const imagePath = submission.image ? await storePhoto(submission.image, 'private') : undefined;
  if (imagePath === null) return null;

  try {
    const speakerIds = await resolveSpeakerIds(admin, submission.lines);
    const tokens = createModerationTokens(env.moderatorEmails);
    const { data: slug, error } = await admin.rpc('create_submission', {
      p_entry_id: entryId,
      p_said_on: submission.saidOn,
      p_submitted_by: submission.submittedBy || undefined,
      p_ip: ip ?? undefined,
      p_lines: buildLinePayload(submission, speakerIds),
      p_tokens: tokens.map((t) => ({
        email: t.email,
        token_hash: t.tokenHash,
        expires_at: t.expiresAt.toISOString(),
      })),
      p_image_path: imagePath,
    });
    if (error) throw new Error(error.message);
    return { entryId, slug, tokens };
  } catch (error) {
    await removePhoto(imagePath);
    throw error;
  }
}

/**
 * Accepts a public submission: honeypot, validation, Turnstile and a per-IP rate limit, then saves
 * it as `pending` with the service role and emails the moderators after the response is sent.
 */
export async function submitEntry(formData: FormData): Promise<SubmitResult> {
  // Bots fill the hidden field; pretend it worked so they learn nothing.
  if (formData.get(HONEYPOT_FIELD)) return { ok: true };

  const parsed = parseSubmission(formData);
  if (!parsed.success) return fail('Please check the form and try again.');

  const env = getServerEnv();
  const ip = getClientIp(await headers());
  const token = formData.get('turnstileToken');
  if (
    !(await verifyTurnstile(typeof token === 'string' ? token : null, env.turnstileSecretKey, ip))
  ) {
    return fail('We could not verify you are human. Please try again.');
  }
  if (!(await checkRateLimit(RATE_LIMITS.submit, ip))) {
    return fail('Too many submissions from your network. Please try again later.');
  }

  let saved;
  try {
    saved = await saveSubmission(parsed.data, ip);
  } catch (error) {
    console.error('Could not save submission', error);
    return fail('Something went wrong on our side. Please try again.');
  }
  if (!saved) return fail('That file is not a supported image.');

  after(async () => {
    try {
      const entry = await getEntryForReview(saved.entryId);
      if (entry) await notifyModerators(entry, saved.tokens);
    } catch (error) {
      console.error('Could not notify moderators', error);
      try {
        await alertDefaultModerator(
          'Moderation email failed',
          `A new submission (${saved.slug ?? saved.entryId}) could not be emailed to the moderators.\n\nIt is waiting in the admin queue.`,
        );
      } catch (alertError) {
        console.error('Could not send the failure alert', alertError);
      }
    }
  });
  return { ok: true };
}
