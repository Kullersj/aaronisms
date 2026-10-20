import 'server-only';
import { revalidateTag } from 'next/cache';
import type { EntryEdit } from '@aaronisms/db/schemas';
import { ENTRIES_TAG } from '@/features/entries/queries';
import { buildLinePayload } from '@/features/submissions/lines';
import { resolveSpeakerIds } from '@/features/submissions/speakers';
import { getServerEnv } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { copyPhoto, removePhoto, swapPhoto } from '@/lib/supabase/photos';
import { isPrivateImage } from '@/lib/supabase/storage';
import { hashToken, isTokenShaped } from './tokens';

export type Decision = { kind: 'approve' } | { kind: 'reject'; note?: string };

export type DecisionOutcome = 'decided' | 'already_decided' | 'invalid' | 'expired';

const OUTCOMES: readonly string[] = ['decided', 'already_decided', 'invalid', 'expired'];

/** The edit as database arguments: resolves speakers, then builds the line payload. */
async function editArguments(edit: EntryEdit | undefined) {
  if (!edit) return {};
  const admin = createAdminClient();
  const speakerIds = await resolveSpeakerIds(admin, edit.lines);
  return { p_said_on: edit.saidOn ?? undefined, p_lines: buildLinePayload(edit, speakerIds) };
}

/** A pending entry's private photo, copied to the public bucket but not yet referenced. */
type StagedPhoto = { entryId: string; from: string; to: string };

/**
 * Before approving: copies the entry's private photo into the public bucket under a new random
 * name. Throws if the copy fails, so an entry is never published with a photo that cannot be
 * shown; the moderator sees an error and can retry. The copy is unreferenced until `finishPhoto`.
 */
async function stagePhoto(entryId: string | null | undefined): Promise<StagedPhoto | null> {
  if (!entryId) return null;
  const { data, error } = await createAdminClient()
    .from('entries')
    .select('image_path')
    .eq('id', entryId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the photo: ${error.message}`);
  if (!data?.image_path || !isPrivateImage(data.image_path)) return null;
  return { entryId, from: data.image_path, to: await copyPhoto(data.image_path, 'public') };
}

/**
 * After the decision: points a published entry at the public copy and deletes the private
 * original; for any other result, deletes the unused copy. If the swap fails after publishing, the
 * error is logged and the photo stays private (the entry shows no image until an admin fixes it).
 */
async function finishPhoto(staged: StagedPhoto | null, outcome: string | null | undefined) {
  if (!staged) return;
  if (outcome === 'decided') await swapPhoto(staged.entryId, staged.from, staged.to);
  else await removePhoto(staged.to);
}

function toOutcome(outcome: string | null): DecisionOutcome {
  if (!outcome || !OUTCOMES.includes(outcome)) throw new Error(`Unexpected outcome: ${outcome}`);
  if (outcome === 'decided') {
    // Any decision changes what the public may see; expire at once rather than after an hour.
    revalidateTag(ENTRIES_TAG, { expire: 0 });
  }
  return outcome as DecisionOutcome;
}

/**
 * Applies a moderator's decision from an emailed link, optionally editing the entry in the same
 * transaction. The first decision wins; later ones get `already_decided`. Call only from a Server
 * Action: a link opened with GET must never reach this.
 */
export async function decideWithToken(
  token: string,
  decision: Decision,
  edit?: EntryEdit,
): Promise<DecisionOutcome> {
  if (!isTokenShaped(token)) return 'invalid';
  const admin = createAdminClient();
  const tokenHash = hashToken(token);
  const allowed = getServerEnv().moderatorEmails;
  let staged: StagedPhoto | null = null;
  if (decision.kind === 'approve') {
    const state = await admin.rpc('moderation_token_state', {
      p_token_hash: tokenHash,
      p_allowed_emails: allowed,
    });
    if (state.error) throw new Error(`Could not check the link: ${state.error.message}`);
    staged = state.data.outcome === 'open' ? await stagePhoto(state.data.entry_id) : null;
  }
  const { data, error } = await admin.rpc('decide_entry', {
    p_token_hash: tokenHash,
    p_allowed_emails: allowed,
    p_decision: decision.kind,
    p_note: decision.kind === 'reject' ? decision.note : undefined,
    ...(await editArguments(edit)),
  });
  if (error) {
    await finishPhoto(staged, null);
    throw new Error(`Could not record the decision: ${error.message}`);
  }
  await finishPhoto(staged, data.outcome);
  return toOutcome(data.outcome);
}

/** The same decision for the signed-in admin. The caller must have run `requireAdmin()`. */
export async function decideAsAdmin(
  entryId: string,
  adminEmail: string,
  decision: Decision,
  edit?: EntryEdit,
): Promise<DecisionOutcome> {
  const staged = decision.kind === 'approve' ? await stagePhoto(entryId) : null;
  const { data, error } = await createAdminClient().rpc('decide_entry_as_admin', {
    p_entry_id: entryId,
    p_admin_email: adminEmail,
    p_decision: decision.kind,
    p_note: decision.kind === 'reject' ? decision.note : undefined,
    ...(await editArguments(edit)),
  });
  if (error) {
    await finishPhoto(staged, null);
    throw new Error(`Could not record the decision: ${error.message}`);
  }
  await finishPhoto(staged, data.outcome);
  return toOutcome(data.outcome);
}
