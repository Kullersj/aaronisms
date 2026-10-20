import { EmptyState } from '@/components/layout/EmptyState';
import { EntryCard } from '@/features/entries/components/EntryCard';
import { approveEntryAsAdmin, rejectEntryAsAdmin } from '@/features/admin/actions';
import { DecisionPanel } from '@/features/moderation/components/DecisionPanel';
import { getPendingEntries } from '@/features/moderation/queries';
import { requireAdmin } from '@/lib/auth';

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function AdminQueuePage({ searchParams }: PageProps) {
  await requireAdmin();
  const [{ message }, entries] = await Promise.all([searchParams, getPendingEntries()]);
  const notice = message ? (
    <p role="status" className="bg-card border-border rounded-md border p-3 text-sm">
      {message}
    </p>
  ) : null;
  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {notice}
        <EmptyState title="Nothing waiting" description="New submissions show up here." />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {notice}
      <ul className="flex flex-col gap-8">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              Submitted by {entry.submittedBy ?? 'Anonymous'}
            </p>
            <EntryCard entry={entry} headingLevel="h2" linked={false} />
            <DecisionPanel
              target={{ name: 'entryId', value: entry.id }}
              approve={approveEntryAsAdmin}
              reject={rejectEntryAsAdmin}
              editHref={`/admin/entries/${entry.id}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
