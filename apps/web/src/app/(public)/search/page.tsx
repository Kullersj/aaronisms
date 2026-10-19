import type { Metadata } from 'next';
import { SearchResults } from '@/features/search/components/SearchResults';
import { searchEntries } from '@/features/search/queries';
import { normalizeQuery } from '@/features/search/utils';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ q?: string | string[]; speaker?: string | string[] }> };

export const metadata: Metadata = { title: 'Search' };

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = normalizeQuery(params.q);
  const speaker = normalizeQuery(params.speaker) || undefined;
  const entries = await searchEntries(query);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-light tracking-tight">Search</h1>
      <SearchResults query={query} entries={entries} speakerSlug={speaker} />
    </div>
  );
}
