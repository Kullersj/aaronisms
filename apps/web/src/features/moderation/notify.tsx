import 'server-only';
import { AlertEmail, NewSubmissionEmail, newSubmissionSubject, sendEmail } from '@aaronisms/email';
import { formatEntryDate } from '@/features/entries/utils';
import { getServerEnv } from '@/lib/env';
import { buildImageUrl } from '@/lib/supabase/storage';
import type { ReviewEntry } from './queries';
import type { ModerationToken } from './tokens';

/** The link a moderator gets for one action; the page itself never acts on GET. */
export function moderationUrl(
  siteUrl: string,
  token: string,
  action: 'approve' | 'reject' | 'edit',
) {
  return `${siteUrl}/moderate/${token}?action=${action}`;
}

/** Emails the default moderator that something failed behind the scenes. Throws if it cannot send. */
export async function alertDefaultModerator(title: string, details: string) {
  const env = getServerEnv();
  await sendEmail(env.email, {
    to: env.defaultModerator,
    subject: title,
    react: <AlertEmail title={title} details={details} />,
  });
}

/**
 * Emails every moderator about a new submission. Failures are logged and reported to the default
 * moderator rather than thrown, because this runs after the submitter already got their response.
 */
export async function notifyModerators(entry: ReviewEntry, tokens: ModerationToken[]) {
  const env = getServerEnv();
  const results = await Promise.allSettled(
    tokens.map((moderator) =>
      sendEmail(env.email, {
        to: moderator.email,
        replyTo: env.defaultModerator,
        subject: newSubmissionSubject(entry.submittedBy),
        react: (
          <NewSubmissionEmail
            submitterName={entry.submittedBy}
            dateLabel={entry.saidOn ? formatEntryDate(entry.saidOn) : ''}
            lines={entry.lines.map((line) => ({
              kind: line.kind,
              speaker: line.speaker?.name ?? line.speakerLabel,
              text: line.text,
            }))}
            imageUrl={entry.imagePath ? buildImageUrl(env.supabaseUrl, entry.imagePath) : null}
            approveUrl={moderationUrl(env.siteUrl, moderator.token, 'approve')}
            rejectUrl={moderationUrl(env.siteUrl, moderator.token, 'reject')}
            editUrl={moderationUrl(env.siteUrl, moderator.token, 'edit')}
          />
        ),
      }),
    ),
  );

  const failed = tokens.filter((_, index) => results[index]?.status === 'rejected');
  if (failed.length === 0) return;
  console.error('Could not send moderation emails', {
    entry: entry.slug,
    failed: failed.map((t) => t.email),
  });
  await alertDefaultModerator(
    'Moderation email failed',
    `A new submission (${entry.slug}) could not be emailed to: ${failed.map((t) => t.email).join(', ')}.\n\nIt is waiting in the admin queue.`,
  ).catch((error: unknown) => console.error('Could not send the failure alert', error));
}
