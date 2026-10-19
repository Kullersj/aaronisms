import type { Metadata } from 'next';
import { EmptyState } from '@/components/layout/EmptyState';
import { MemeGrid } from '@/features/memes/components/MemeGrid';
import { getMemes } from '@/features/memes/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Memes' };

export default async function MemesPage() {
  const memes = await getMemes();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-light tracking-tight">Don&apos;t Let Your Memes Be Dreams</h1>
      {memes.length > 0 ? <MemeGrid memes={memes} /> : <EmptyState title="No memes yet" />}
    </div>
  );
}
