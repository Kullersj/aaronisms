import { EmptyState } from '@/components/layout/EmptyState';
import { EntryCard } from '@/features/entries/components/EntryCard';
import { approveEntryAsAdmin, rejectEntryAsAdmin } from '@/features/admin/actions';
import { DecisionPanel } from '@/features/moderation/components/DecisionPanel';
import { getPendingEntries } from '@/features/moderation/queries';
import { requireAdmin } from '@/lib/auth';

export default async function AdminQueuePage() {
  await requireAdmin();
  const entries = await getPendingEntries();
  if (entries.length === 0) {
    return <EmptyState title="Nothing waiting" description="New submissions show up here." />;
  }
  return (
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
  );
}
