import type { Entry } from '@aaronisms/db/schemas';

export type YearGroup = { year: number; entries: Entry[] };

const dateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

/** `2026-10-12` becomes `October 12, 2026`. Uses UTC so the day never shifts with the viewer's zone. */
export function formatEntryDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

export function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

/** The trailing counter of a slug: `2026-10-12-2` is 2. Slugs without one (`2026-10-12`) sort first. */
function slugCounter(slug: string): number {
  return Number(/^(?:\d{4}-\d{2}-\d{2}|college)-(\d+)$/.exec(slug)?.[1] ?? 0);
}

/**
 * Newest date first. Entries sharing a date put the most recently added first; ones added together
 * (the Google Sites import) keep their original (slug counter) order.
 */
export function compareEntries(a: Entry, b: Entry): number {
  if (a.saidOn !== b.saidOn) {
    if (a.saidOn === null) return 1;
    if (b.saidOn === null) return -1;
    return a.saidOn < b.saidOn ? 1 : -1;
  }
  const added = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (added !== 0) return added;
  return slugCounter(a.slug) - slugCounter(b.slug);
}

/** Groups dated entries by year, newest year first, preserving the given order inside a year. */
export function groupEntriesByYear(entries: Entry[]): YearGroup[] {
  const groups = new Map<number, Entry[]>();
  for (const entry of [...entries].sort(compareEntries)) {
    if (entry.saidOn === null) continue;
    const year = yearOf(entry.saidOn);
    const group = groups.get(year);
    if (group) group.push(entry);
    else groups.set(year, [entry]);
  }
  return [...groups].map(([year, list]) => ({ year, entries: list }));
}

/** Stage directions are stored without brackets; show them as `[Everyone nods.]`. */
export function formatStageDirection(text: string): string {
  const trimmed = text.trim();
  return trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed : `[${trimmed}]`;
}

/** The description for link previews: generic when the entry opted out of quoting. */
export function entryDescription(entry: Entry): string {
  return entry.noPreview ? 'An Aaronism.' : entrySummary(entry);
}

/** A short plain-text summary for page metadata: the first spoken line, trimmed. */
export function entrySummary(entry: Entry, maxLength = 160): string {
  const line = entry.lines.find((l) => l.kind === 'line') ?? entry.lines[0];
  if (!line) return 'An Aaronism.';
  const who = line.speaker?.name ?? line.speakerLabel;
  const text = who && line.kind === 'line' ? `${who}: ${line.text}` : line.text;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}
