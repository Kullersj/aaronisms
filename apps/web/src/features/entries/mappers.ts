import { entrySchema, type Entry, type EntryStatus } from '@aaronisms/db/schemas';

export type EntryLineRow = {
  id: string;
  position: number;
  kind: 'line' | 'stage' | 'context';
  speaker_label: string | null;
  text: string;
  speaker: { id: string; name: string; slug: string } | null;
};

export type EntryRow = {
  id: string;
  slug: string;
  said_on: string | null;
  era: 'modern' | 'college';
  status: EntryStatus;
  image_path: string | null;
  image_alt: string | null;
  no_preview: boolean;
  published_at: string | null;
  created_at: string;
  lines: EntryLineRow[];
};

/** Maps a snake_case database row to the camelCase domain type, validating it with Zod. */
export function toEntry(row: EntryRow): Entry {
  return entrySchema.parse({
    id: row.id,
    slug: row.slug,
    saidOn: row.said_on,
    era: row.era,
    status: row.status,
    imagePath: row.image_path,
    imageAlt: row.image_alt,
    noPreview: row.no_preview,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    lines: [...row.lines]
      .sort((a, b) => a.position - b.position)
      .map((line) => ({
        id: line.id,
        position: line.position,
        kind: line.kind,
        speaker: line.speaker,
        speakerLabel: line.speaker_label,
        text: line.text,
      })),
  });
}
