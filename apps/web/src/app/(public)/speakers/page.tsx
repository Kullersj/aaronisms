import type { Metadata } from 'next';
import { EmptyState } from '@/components/layout/EmptyState';
import { SpeakerList } from '@/features/speakers/components/SpeakerList';
import { getPublicSpeakers } from '@/features/speakers/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Speakers' };

export default async function SpeakersPage() {
  const speakers = await getPublicSpeakers();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-light tracking-tight">Speakers</h1>
      {speakers.length > 0 ? (
        <SpeakerList speakers={speakers} />
      ) : (
        <EmptyState title="Nothing here yet" />
      )}
    </div>
  );
}
