import { ImageResponse } from 'next/og';
import { isSlug } from '@aaronisms/db/slug';
import { getEntryBySlug } from '@/features/entries/queries';
import { ogContent } from '@/features/entries/og';
import { QuoteCard, SiteCard } from '@/features/entries/components/OgCards';
import { formatEntryDate } from '@/features/entries/utils';

export const dynamic = 'force-dynamic';
export const alt = 'An Aaronism';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type ImageProps = { params: Promise<{ slug: string }> };

/**
 * Quote card for sharing a permalink. Only published entries render; anything else is a 404.
 * An entry flagged `no_preview` gets the generic site card instead of its quote.
 */
export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const entry = isSlug(slug) ? await getEntryBySlug(slug) : null;
  if (!entry) return new Response('Not found', { status: 404 });
  if (entry.noPreview) return new ImageResponse(<SiteCard />, size);

  const { lines, truncated } = ogContent(entry);
  const date = entry.saidOn ? formatEntryDate(entry.saidOn) : 'The College Years';
  return new ImageResponse(<QuoteCard date={date} lines={lines} truncated={truncated} />, size);
}
