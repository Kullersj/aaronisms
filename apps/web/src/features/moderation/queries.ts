import 'server-only';
import type { Entry } from '@aaronisms/db/schemas';
import { toEntry, type EntryRow } from '@/features/entries/mappers';
import { compareEntries } from '@/features/entries/utils';
import { getServerEnv } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken, isTokenShaped } from './tokens';

/** An entry as moderators see it: the public shape plus the private submitter name. */
export type ReviewEntry = Entry & { submittedBy: string | null };
type ReviewRow = EntryRow & { submitted_by: string | null };

function toReviewEntry(row: ReviewRow): ReviewEntry {
  return { ...toEntry(row), submittedBy: row.submitted_by };
}

export type TokenView =
  | { state: 'open'; entry: ReviewEntry }
  | {
      state: 'decided';
      status: 'pending' | 'published' | 'rejected';
      reviewedBy: string | null;
      note: string | null;
    }
  | { state: 'expired' }
  | { state: 'invalid' };

// Includes `submitted_by`, which is private: read it with the service role only, never publicly.
const REVIEW_COLUMNS =
  'id, slug, said_on, era, status, image_path, image_alt, no_preview, submitted_by, published_at, created_at, lines:entry_lines(id, position, kind, speaker_label, text, speaker:speakers(id, name, slug))';

/** One entry by id for moderators, whatever its status. Service role: callers must authorise. */
export async function getEntryForReview(id: string): Promise<ReviewEntry | null> {
  const { data, error } = await createAdminClient()
    .from('entries')
    .select(REVIEW_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not load entry: ${error.message}`);
  return data ? toReviewEntry(data satisfies ReviewRow) : null;
}

/** Pending entries, oldest submission first. Service role: callers must authorise. */
export async function getPendingEntries(): Promise<ReviewEntry[]> {
  const { data, error } = await createAdminClient()
    .from('entries')
    .select(REVIEW_COLUMNS)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Could not load the queue: ${error.message}`);
  return (data satisfies ReviewRow[]).map(toReviewEntry);
}

/** Every entry whatever its status, newest first, for the admin. Service role: callers must authorise. */
export async function getAllEntries(): Promise<ReviewEntry[]> {
  const { data, error } = await createAdminClient().from('entries').select(REVIEW_COLUMNS);
  if (error) throw new Error(`Could not load entries: ${error.message}`);
  return (data satisfies ReviewRow[]).map(toReviewEntry).sort(compareEntries);
}

/**
 * What a moderation link should show. Read-only: it never changes anything, so scanners that
 * open the link in an email cannot approve or reject by accident.
 */
export async function getTokenView(token: string): Promise<TokenView> {
  if (!isTokenShaped(token)) return { state: 'invalid' };
  const { data, error } = await createAdminClient().rpc('moderation_token_state', {
    p_token_hash: hashToken(token),
    p_allowed_emails: getServerEnv().moderatorEmails,
  });
  if (error) throw new Error(`Could not check the link: ${error.message}`);

  switch (data.outcome) {
    case 'open': {
      const entry = data.entry_id ? await getEntryForReview(data.entry_id) : null;
      return entry ? { state: 'open', entry } : { state: 'invalid' };
    }
    case 'already_decided':
      return {
        state: 'decided',
        status: data.status ?? 'pending',
        reviewedBy: data.reviewed_by_email,
        note: data.decision_note,
      };
    case 'expired':
      return { state: 'expired' };
    default:
      return { state: 'invalid' };
  }
}
