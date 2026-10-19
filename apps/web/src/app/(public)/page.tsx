import { EmptyState } from '@/components/layout/EmptyState';
import { EntryFeed } from '@/features/entries/components/EntryFeed';
import { getPublishedEntries } from '@/features/entries/queries';

// Data comes from Supabase at request time (then the data cache), never at build time.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const entries = await getPublishedEntries();
  return (
    <>
      <h1 className="sr-only">All Aaronisms</h1>
      {entries.length > 0 ? (
        <EntryFeed entries={entries} />
      ) : (
        <EmptyState title="Nothing here yet" description="Check back soon." />
      )}
    </>
  );
}
