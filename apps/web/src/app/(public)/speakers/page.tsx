import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/layout/EmptyState';
import { SpeakerList } from '@/features/speakers/components/SpeakerList';
import { POINTS, rankSpeakers } from '@/features/speakers/points';
import { getPublicSpeakers } from '@/features/speakers/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Speakers' };

type PageProps = { searchParams: Promise<{ sort?: string | string[] }> };

export default async function SpeakersPage({ searchParams }: PageProps) {
  const byName = (await searchParams).sort === 'name';
  const ranked = rankSpeakers(await getPublicSpeakers());
  const speakers = byName ? [...ranked].sort((a, b) => a.name.localeCompare(b.name)) : ranked;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-light tracking-tight">Speakers</h1>
      {speakers.length > 0 ? (
        <>
          <nav aria-label="Sort speakers" className="flex gap-4 text-sm">
            <SortLink href="/speakers" current={!byName}>
              By points
            </SortLink>
            <SortLink href="/speakers?sort=name" current={byName}>
              A to Z
            </SortLink>
          </nav>
          <p className="text-muted-foreground text-sm">
            Speakers earn {POINTS.entry} points for each Aaronism they are in and {POINTS.line} for
            each line they say.
          </p>
          <SpeakerList speakers={speakers} showRank={!byName} />
        </>
      ) : (
        <EmptyState title="Nothing here yet" />
      )}
    </div>
  );
}

function SortLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? 'true' : undefined}
      className="focus-visible:ring-ring aria-[current=true]:text-foreground text-muted-foreground rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none aria-[current=true]:font-medium"
    >
      {children}
    </Link>
  );
}
