import Link from 'next/link';
import type { EntryStatus } from '@aaronisms/db/schemas';
import { formatEntryDate, formatStageDirection } from '@/features/entries/utils';
import type { ReviewEntry } from '@/features/moderation/queries';

const STATUS_LABELS: Record<EntryStatus, string> = {
  pending: 'Pending',
  published: 'Published',
  rejected: 'Rejected',
};

/** One entry in the admin's list: its date, status and first line, linking to its edit page. */
export function EntryListItem({ entry }: { entry: ReviewEntry }) {
  const first = entry.lines[0];
  const speaker = first?.speaker?.name ?? first?.speakerLabel;
  return (
    <li className="bg-card border-border flex flex-col gap-1 rounded-md border p-4">
      <p className="text-muted-foreground text-sm">
        {entry.saidOn ? formatEntryDate(entry.saidOn) : 'Undated'} · {STATUS_LABELS[entry.status]}
      </p>
      <p className="line-clamp-2">
        {speaker ? <strong className="font-semibold">{speaker}: </strong> : null}
        {first?.kind === 'stage' ? formatStageDirection(first.text) : first?.text}
      </p>
      <Link
        href={`/admin/entries/${entry.id}`}
        className="self-start text-sm underline-offset-4 hover:underline"
        aria-label={`Edit entry ${entry.slug}`}
      >
        Edit
      </Link>
    </li>
  );
}
