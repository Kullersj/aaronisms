import type { Entry } from '@aaronisms/db/schemas';
import { groupEntriesByYear } from '../utils';
import { EntryCard } from './EntryCard';
import { YearNav } from './YearNav';

export type EntryFeedProps = { entries: Entry[] };

export function EntryFeed({ entries }: EntryFeedProps) {
  const groups = groupEntriesByYear(entries);
  return (
    <div className="flex flex-col gap-4">
      <YearNav years={groups.map((group) => group.year)} />
      {groups.map(({ year, entries: yearEntries }) => (
        <section key={year} aria-labelledby={`year-${year}`} className="flex flex-col gap-4">
          <h2
            id={`year-${year}`}
            className="bg-muted/90 sticky top-0 z-10 -mx-4 px-4 py-3 text-2xl font-light backdrop-blur max-sm:top-14 max-sm:scroll-mt-14"
          >
            {year}
          </h2>
          {yearEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </section>
      ))}
    </div>
  );
}
