import { notFound } from 'next/navigation';
import { AdminEntryForm } from '@/features/admin/components/AdminEntryForm';
import { getEntryForReview } from '@/features/moderation/queries';
import { entryToEditValues } from '@/features/submissions/lines';
import { getSpeakerNames } from '@/features/submissions/queries';
import { requireAdmin } from '@/lib/auth';
import { getImageUrl } from '@/lib/supabase/storage';

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminEntryPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const entry = await getEntryForReview(id);
  if (!entry) notFound();
  return (
    <AdminEntryForm
      entryId={entry.id}
      initial={entryToEditValues(entry)}
      status={entry.status}
      imageUrl={entry.imagePath ? getImageUrl(entry.imagePath) : null}
      imageAlt={entry.imageAlt}
      speakers={await getSpeakerNames()}
    />
  );
}
