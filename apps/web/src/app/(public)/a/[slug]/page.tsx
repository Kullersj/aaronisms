import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSlug } from '@aaronisms/db/slug';
import { ArrowLeft } from 'lucide-react';
import { CopyLinkButton } from '@/features/entries/components/CopyLinkButton';
import { EntryCard } from '@/features/entries/components/EntryCard';
import { getEntryBySlug } from '@/features/entries/queries';
import { entryDescription, formatEntryDate } from '@/features/entries/utils';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = isSlug(slug) ? await getEntryBySlug(slug) : null;
  if (!entry) return { title: 'Not found' };
  return {
    title: entry.saidOn ? formatEntryDate(entry.saidOn) : 'The College Years',
    description: entryDescription(entry),
  };
}

export default async function EntryPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = isSlug(slug) ? await getEntryBySlug(slug) : null;
  if (!entry) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={entry.saidOn ? '/' : '/college'}
          className="focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {entry.saidOn ? 'All Aaronisms' : 'The College Years'}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <CopyLinkButton path={`/a/${entry.slug}`} />
        </div>
      </div>
      {entry.saidOn ? null : (
        <h1 className="text-4xl font-light tracking-tight">The College Years</h1>
      )}
      <EntryCard entry={entry} headingLevel="h1" linked={false} />
    </div>
  );
}
