import type { Metadata } from 'next';
import { EmptyState } from '@/components/layout/EmptyState';
import { EntryCard } from '@/features/entries/components/EntryCard';
import { getCollegeEntries } from '@/features/entries/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'The College Years' };

export default async function CollegePage() {
  const entries = await getCollegeEntries();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-light tracking-tight">The College Years</h1>
      {entries.length > 0 ? (
        entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)
      ) : (
        <EmptyState title="Nothing here yet" />
      )}
    </div>
  );
}
