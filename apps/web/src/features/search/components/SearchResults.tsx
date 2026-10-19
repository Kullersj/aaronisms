import { EmptyState } from '@/components/layout/EmptyState';
import { EntryCard } from '@/features/entries/components/EntryCard';
import type { Entry } from '@aaronisms/db/schemas';
import { filterBySpeaker, searchTerms, speakerFacets } from '../utils';
import { SpeakerChips } from './SpeakerChips';

export type SearchResultsProps = {
  query: string;
  /** Everything the query matched, before any speaker filter. */
  entries: Entry[];
  speakerSlug: string | undefined;
};

export function SearchResults({ query, entries, speakerSlug }: SearchResultsProps) {
  if (!query) {
    return (
      <EmptyState
        title="Search the Aaronisms"
        description="Type a word, a phrase in quotes or a name in the box above."
      />
    );
  }
  if (entries.length === 0) {
    return (
      <EmptyState
        title={`No Aaronisms match “${query}”`}
        description="Try fewer or different words, or check the spelling."
      />
    );
  }

  const facets = speakerFacets(entries);
  const active = facets.some((facet) => facet.slug === speakerSlug) ? speakerSlug : undefined;
  const shown = filterBySpeaker(entries, active);
  const terms = searchTerms(query);

  return (
    <div className="flex flex-col gap-4">
      <SpeakerChips query={query} facets={facets} active={active} total={entries.length} />
      <p role="status" className="text-muted-foreground text-sm">
        {shown.length} {shown.length === 1 ? 'result' : 'results'} for “{query}”
        {active ? ` by ${facets.find((f) => f.slug === active)?.name}` : ''}
      </p>
      {shown.map((entry) => (
        <EntryCard key={entry.id} entry={entry} headingLevel="h2" highlight={terms} />
      ))}
    </div>
  );
}
