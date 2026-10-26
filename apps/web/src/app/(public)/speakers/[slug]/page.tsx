import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSlug } from '@aaronisms/db/slug';
import { ArrowLeft } from 'lucide-react';
import { EntryCard } from '@/features/entries/components/EntryCard';
import { nextToPass, rankSpeakers } from '@/features/speakers/points';
import { getPublicSpeakers, getSpeakerPage } from '@/features/speakers/queries';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = isSlug(slug) ? await getSpeakerPage(slug) : null;
  if (!page) return { title: 'Not found' };
  return {
    title: page.speaker.name,
    description: `${page.speaker.lineCount} ${page.speaker.lineCount === 1 ? 'line' : 'lines'} by ${page.speaker.name}.`,
  };
}

export default async function SpeakerPage({ params }: PageProps) {
  const { slug } = await params;
  const page = isSlug(slug) ? await getSpeakerPage(slug) : null;
  if (!page) notFound();
  const { speaker, entries } = page;
  const ranked = rankSpeakers(await getPublicSpeakers());
  const standing = ranked.find((other) => other.id === speaker.id);
  const next = nextToPass(ranked, speaker.id);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/speakers"
        className="focus-visible:ring-ring inline-flex items-center gap-1 self-start rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All speakers
      </Link>
      <div>
        <h1 className="text-4xl font-light tracking-tight">{speaker.name}</h1>
        <p className="text-muted-foreground mt-1">
          {speaker.lineCount} {speaker.lineCount === 1 ? 'line' : 'lines'} in {entries.length}{' '}
          {entries.length === 1 ? 'Aaronism' : 'Aaronisms'}
        </p>
        {standing && (
          <p className="mt-1">
            <strong className="font-semibold">
              {standing.points} {standing.points === 1 ? 'point' : 'points'}
            </strong>
            , #{standing.rank} of {ranked.length}.{' '}
            {next ? (
              <>
                {next.pointsNeeded} more to pass{' '}
                <Link
                  href={`/speakers/${next.speaker.slug}`}
                  className="focus-visible:ring-ring rounded-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
                >
                  {next.speaker.name}
                </Link>
                .
              </>
            ) : (
              'Top of the leaderboard.'
            )}
          </p>
        )}
      </div>
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} headingLevel="h2" />
      ))}
    </div>
  );
}
