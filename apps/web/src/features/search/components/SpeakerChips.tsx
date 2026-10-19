import Link from 'next/link';
import { cn } from '@aaronisms/ui/lib/utils';
import { searchHref, type SpeakerFacet } from '../utils';

export type SpeakerChipsProps = {
  query: string;
  facets: SpeakerFacet[];
  /** Slug of the speaker currently filtered on, if any. */
  active: string | undefined;
  total: number;
};

const chip =
  'focus-visible:ring-ring inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none';

/** Plain links, so filtering works without JavaScript. */
export function SpeakerChips({ query, facets, active, total }: SpeakerChipsProps) {
  if (facets.length === 0) return null;
  return (
    <nav aria-label="Filter by speaker">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={searchHref(query)}
            aria-current={active ? undefined : 'true'}
            className={cn(
              chip,
              'border-border bg-card hover:bg-accent aria-[current=true]:border-foreground aria-[current=true]:bg-foreground aria-[current=true]:text-background',
            )}
          >
            Everyone <span className="opacity-70">{total}</span>
          </Link>
        </li>
        {facets.map((facet) => (
          <li key={facet.slug}>
            <Link
              href={searchHref(query, facet.slug)}
              aria-current={active === facet.slug ? 'true' : undefined}
              className={cn(
                chip,
                'border-border bg-card hover:bg-accent aria-[current=true]:border-foreground aria-[current=true]:bg-foreground aria-[current=true]:text-background',
              )}
            >
              {facet.name} <span className="opacity-70">{facet.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
