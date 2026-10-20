import Image from 'next/image';
import Link from 'next/link';
import { Link2 } from 'lucide-react';
import type { Entry } from '@aaronisms/db/schemas';
import { Card, CardContent, CardHeader } from '@aaronisms/ui/card';
import { getImageUrl, isPrivateImage } from '@/lib/supabase/storage';
import { formatEntryDate } from '../utils';
import { DialogueLine } from './DialogueLine';

export type EntryCardProps = {
  entry: Entry;
  /** Heading level for the date, so the page's outline stays in order. */
  headingLevel?: 'h1' | 'h2' | 'h3';
  /** Link the date (or, for undated entries, an icon) to the entry's permalink. */
  linked?: boolean;
  /** Words to mark in the lines, for search results. */
  highlight?: string[];
  /**
   * A ready URL for the photo, for a private one (a signed URL). It is shown unoptimised: the
   * optimizer would cache a URL that expires and only fetches public Storage paths.
   */
  imageUrl?: string | null;
};

export function EntryCard({
  entry,
  headingLevel = 'h3',
  linked = true,
  highlight,
  imageUrl,
}: EntryCardProps) {
  const Heading = headingLevel;
  const href = `/a/${entry.slug}`;
  const date = entry.saidOn ? formatEntryDate(entry.saidOn) : null;
  const src =
    imageUrl ??
    (entry.imagePath && !isPrivateImage(entry.imagePath) ? getImageUrl(entry.imagePath) : null);
  const headingClass = 'text-3xl font-light tracking-tight sm:text-4xl';

  return (
    <Card as="article" id={`entry-${entry.slug}`}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        {date ? (
          <Heading className={headingClass}>
            {linked ? (
              <Link
                href={href}
                className="focus-visible:ring-ring rounded-sm hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {date}
              </Link>
            ) : (
              date
            )}
          </Heading>
        ) : (
          <span />
        )}
        {linked && !date ? (
          <Link
            href={href}
            aria-label="Permalink to this entry"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm p-1 focus-visible:ring-2 focus-visible:outline-none"
          >
            <Link2 className="size-5" aria-hidden="true" />
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="pt-3 pb-5 text-lg leading-relaxed">
        {entry.lines.map((line) => (
          <DialogueLine key={line.id} line={line} highlight={highlight} />
        ))}
        {src ? (
          <Image
            src={src}
            unoptimized={imageUrl != null}
            alt={entry.imageAlt ?? ''}
            width={1200}
            height={900}
            sizes="(min-width: 768px) 700px, 100vw"
            className="border-border mt-2 h-auto w-full rounded-md border"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
