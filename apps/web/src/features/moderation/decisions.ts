import 'server-only';
import { revalidateTag } from 'next/cache';
import type { EntryEdit } from '@aaronisms/db/schemas';
import { ENTRIES_TAG } from '@/features/entries/queries';
import { buildLinePayload } from '@/features/submissions/lines';
import { resolveSpeakerIds } from '@/features/submissions/speakers';
import { getServerEnv } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
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
  const { data, error } = await createAdminClient().rpc('decide_entry', {
    p_token_hash: hashToken(token),
    p_allowed_emails: getServerEnv().moderatorEmails,
    p_decision: decision.kind,
    p_note: decision.kind === 'reject' ? decision.note : undefined,
    ...(await editArguments(edit)),
  });
  if (error) throw new Error(`Could not record the decision: ${error.message}`);
  return toOutcome(data.outcome);
}

/** The same decision for the signed-in admin. The caller must have run `requireAdmin()`. */
export async function decideAsAdmin(
  entryId: string,
  adminEmail: string,
  decision: Decision,
  edit?: EntryEdit,
): Promise<DecisionOutcome> {
  const { data, error } = await createAdminClient().rpc('decide_entry_as_admin', {
    p_entry_id: entryId,
    p_admin_email: adminEmail,
    p_decision: decision.kind,
    p_note: decision.kind === 'reject' ? decision.note : undefined,
    ...(await editArguments(edit)),
  });
  if (error) throw new Error(`Could not record the decision: ${error.message}`);
  return toOutcome(data.outcome);
}
