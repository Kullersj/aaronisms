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
  const facets = speakerFacets(entries);
  const active = facets.some((facet) => facet.slug === speakerSlug) ? speakerSlug : undefined;
  const shown = filterBySpeaker(entries, active);
  const terms = searchTerms(query);
  const speakerName = facets.find((f) => f.slug === active)?.name;

  // One region that always exists, so screen readers announce every change of the count.
  const status = !query
    ? ''
    : entries.length === 0
      ? `No results for “${query}”`
      : `${shown.length} ${shown.length === 1 ? 'result' : 'results'} for “${query}”${speakerName ? ` by ${speakerName}` : ''}`;

  return (
    <div className="flex flex-col gap-4">
      <p
        role="status"
        aria-live="polite"
        className={entries.length > 0 ? 'text-muted-foreground text-sm' : 'sr-only'}
      >
        {status}
      </p>
      {!query ? (
        <EmptyState
          title="Search the Aaronisms"
          description="Type a word, a phrase in quotes or a name in the box above."
        />
      ) : entries.length === 0 ? (
        <EmptyState
          title={`No Aaronisms match “${query}”`}
          description="Try fewer or different words, or check the spelling."
        />
      ) : (
        <>
          <SpeakerChips query={query} facets={facets} active={active} total={entries.length} />
          {shown.map((entry) => (
            <EntryCard key={entry.id} entry={entry} headingLevel="h2" highlight={terms} />
          ))}
        </>
      )}
    </div>
  );
}
