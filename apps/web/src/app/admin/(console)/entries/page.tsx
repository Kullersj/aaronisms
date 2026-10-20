import { Button } from '@aaronisms/ui/button';
import { Input } from '@aaronisms/ui/input';
import { EmptyState } from '@/components/layout/EmptyState';
import { AdminNotice } from '@/features/admin/components/AdminNotice';
import { adminMessage } from '@/features/admin/messages';
import { EntryListItem } from '@/features/admin/components/EntryListItem';
import { getAllEntries, type ReviewEntry } from '@/features/moderation/queries';
import { requireAdmin } from '@/lib/auth';

type PageProps = { searchParams: Promise<{ q?: string | string[]; message?: string | string[] }> };

/** A repeated parameter (`?q=a&q=b`) arrives as an array; use its first value. */
const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

/** Whether every word of the filter appears in the entry's speakers, lines or slug. */
function matches(entry: ReviewEntry, words: string[]): boolean {
  const text = [
    entry.slug,
    ...entry.lines.flatMap((line) => [line.speaker?.name, line.speakerLabel, line.text]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words.every((word) => text.includes(word));
}

export default async function AdminEntriesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const [params, entries] = await Promise.all([searchParams, getAllEntries()]);
  const q = first(params.q);
  const message = first(params.message);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = words.length > 0 ? entries.filter((entry) => matches(entry, words)) : entries;
  return (
    <div className="flex flex-col gap-4">
      <AdminNotice message={adminMessage(message)} />
      <form action="/admin/entries" className="flex gap-2">
        <Input name="q" type="search" defaultValue={q} aria-label="Filter entries" />
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>
      {shown.length === 0 ? (
        <EmptyState
          title="No entries"
          description={words.length > 0 ? 'Nothing matches that filter.' : 'Nothing here yet.'}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((entry) => (
            <EntryListItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
