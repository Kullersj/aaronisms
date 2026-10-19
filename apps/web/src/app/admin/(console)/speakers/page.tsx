import { SpeakerRow } from '@/features/speakers/components/SpeakerRow';
import { getSpeakerSummaries } from '@/features/speakers/queries';
import { requireAdmin } from '@/lib/auth';

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function AdminSpeakersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const [{ message }, speakers] = await Promise.all([searchParams, getSpeakerSummaries()]);
  return (
    <div className="flex flex-col gap-4">
      {message ? (
        <p role="status" className="bg-card border-border rounded-md border p-3 text-sm">
          {message}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {speakers.map((speaker) => (
          <SpeakerRow
            key={speaker.id}
            speaker={speaker}
            others={speakers.filter((s) => s.id !== speaker.id)}
          />
        ))}
      </ul>
    </div>
  );
}
