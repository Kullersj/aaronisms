import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AdminEntryForm } from '@/features/admin/components/AdminEntryForm';
import { DeleteEntryButton } from '@/features/admin/components/DeleteEntryButton';
import { getEntryForReview } from '@/features/moderation/queries';
import { entryToEditValues } from '@/features/submissions/lines';
import { getSpeakerNames } from '@/features/submissions/queries';
import { requireAdmin } from '@/lib/auth';
import { getImageUrl } from '@/lib/supabase/storage';

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminEntryPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const entry = await getEntryForReview(id);
  if (!entry) notFound();
  return (
    <div className="flex flex-col gap-10">
      <AdminEntryForm
        entryId={entry.id}
        initial={entryToEditValues(entry)}
        status={entry.status}
        imageUrl={entry.imagePath ? getImageUrl(entry.imagePath) : null}
        imageAlt={entry.imageAlt}
        speakers={await getSpeakerNames()}
      />
      <section aria-labelledby="delete-heading" className="border-border border-t pt-6">
        <h2 id="delete-heading" className="mb-3 text-lg font-medium">
          Delete
        </h2>
        <DeleteEntryButton entryId={entry.id} />
      </section>
    </div>
  );
}
