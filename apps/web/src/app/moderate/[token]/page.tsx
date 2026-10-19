import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Card, CardContent } from '@aaronisms/ui/card';
import { EntryCard } from '@/features/entries/components/EntryCard';
import { EditAndApproveForm } from '@/features/moderation/components/EditAndApproveForm';
import { DecisionPanel } from '@/features/moderation/components/DecisionPanel';
import { approveByToken, rejectByToken } from '@/features/moderation/actions';
import { getTokenView, type TokenView } from '@/features/moderation/queries';
import { entryToEditValues } from '@/features/submissions/lines';
import { getSpeakerNames } from '@/features/submissions/queries';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

// The token is in the URL, so keep it out of Referer headers sent to other origins.
export const metadata: Metadata = {
  title: 'Review a submission',
  referrer: 'no-referrer',
};

// Always evaluated per request; a moderation page must never be cached or prerendered.
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ action?: string; done?: string }>;
};

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <h2 className="text-xl font-medium">{title}</h2>
        {children ? <p className="text-muted-foreground">{children}</p> : null}
      </CardContent>
    </Card>
  );
}

function DecidedNotice({
  view,
  justDecided,
}: {
  view: Extract<TokenView, { state: 'decided' }>;
  justDecided: boolean;
}) {
  if (view.status === 'published') {
    return justDecided ? (
      <Notice title="Approved">Thanks. It is on the site now.</Notice>
    ) : (
      <Notice title="Already approved">
        {view.reviewedBy ? `Approved by ${view.reviewedBy}.` : 'Someone already approved it.'}
      </Notice>
    );
  }
  if (view.status === 'rejected') {
    return justDecided ? (
      <Notice title="Rejected">Thanks. It will not be published.</Notice>
    ) : (
      <Notice title="Already rejected">
        {[
          view.reviewedBy ? `Rejected by ${view.reviewedBy}.` : null,
          view.note ? `Reason: ${view.note}` : null,
        ]
          .filter(Boolean)
          .join(' ')}
      </Notice>
    );
  }
  return <Notice title="Not available">This submission is not waiting for review.</Notice>;
}

export default async function ModeratePage({ params, searchParams }: PageProps) {
  const [{ token }, { action, done }] = await Promise.all([params, searchParams]);

  const ip = getClientIp(await headers());
  if (!(await checkRateLimit(RATE_LIMITS.moderate, ip))) {
    return <Notice title="Too many requests">Please wait a few minutes and try again.</Notice>;
  }

  // Reading only: this page never approves or rejects. Decisions are POSTs to Server Actions.
  const view = await getTokenView(token);

  switch (view.state) {
    case 'invalid':
      return (
        <Notice title="This link is not valid">
          It may be incomplete, or the moderator it was sent to is no longer on the list.
        </Notice>
      );
    case 'expired':
      return (
        <Notice title="This link has expired">
          Links last 14 days. Ask for the submission to be reviewed in the admin queue.
        </Notice>
      );
    case 'decided':
      return <DecidedNotice view={view} justDecided={done === '1'} />;
    case 'open': {
      const { entry } = view;
      const editing = action === 'edit';
      return (
        <div className="flex flex-col gap-6">
          <p className="text-muted-foreground text-sm">
            Submitted by {entry.submittedBy ?? 'Anonymous'}.{' '}
            {editing ? null : 'Nothing happens until you press a button below.'}
          </p>
          <EntryCard entry={entry} headingLevel="h2" linked={false} />
          {editing ? (
            <EditAndApproveForm
              token={token}
              initial={entryToEditValues(entry)}
              speakers={await getSpeakerNames()}
            />
          ) : (
            <DecisionPanel
              target={{ name: 'token', value: token }}
              approve={approveByToken}
              reject={rejectByToken}
              editHref={`/moderate/${token}?action=edit`}
              highlight={action === 'approve' || action === 'reject' ? action : undefined}
            />
          )}
          {editing ? (
            <Link href={`/moderate/${token}`} className="text-sm underline underline-offset-4">
              Cancel editing
            </Link>
          ) : null}
        </div>
      );
    }
  }
}
