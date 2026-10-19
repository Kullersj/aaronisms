import { slugForEntry } from '@aaronisms/db/slug';
import { isGroupLabel, type Era, type LineKind, type ParsedEntry } from './parse';

/**
 * Spellings that should become one speaker. Keys are lowercase with punctuation and spaces
 * removed ("A-Rob", "a rob" and "AROB" all become "arob"). Add new variants here; any label
 * not listed keeps the spelling it was first seen with.
 */
const SPEAKER_ALIASES: Record<string, string> = {
  arob: 'Arob',
  kfed: 'KFed',
};

const aliasKey = (label: string) => label.toLowerCase().replace(/[^a-z0-9]/g, '');

export type PlannedLine = {
  position: number;
  kind: LineKind;
  /** Canonical name of a single known speaker. */
  speakerName: string | null;
  /** Raw label kept only for group lines such as "Everyone else". */
  speakerLabel: string | null;
  text: string;
};

export type PlannedEntry = {
  slug: string;
  /** Position of the source `<section>` on its page; see `ParsedEntry.sectionIndex`. */
  sectionIndex: number;
  saidOn: string | null;
  era: Era;
  lines: PlannedLine[];
  /** Image `src` as found on the page; only the first image of an entry is used. */
  imageSrc: string | null;
};

/** Hands out one canonical spelling per speaker across all pages. */
export function createSpeakerRegistry() {
  const names = new Map<string, string>();
  return {
    canonicalName(label: string): string {
      const key = aliasKey(label);
      const name = SPEAKER_ALIASES[key] ?? names.get(key) ?? label.trim();
      names.set(key, name);
      return name;
    },
    get names(): string[] {
      return [...new Set(names.values())];
    },
  };
}

export type SpeakerRegistry = ReturnType<typeof createSpeakerRegistry>;

/** Assigns slugs and resolves speakers. Slug counters follow page order, per date. */
export function planEntries(
  parsed: ParsedEntry[],
  era: Era,
  speakers: SpeakerRegistry,
): PlannedEntry[] {
  const counters = new Map<string, number>();
  return parsed
    .filter((entry) => entry.lines.length > 0)
    .map((entry) => {
      const key = entry.saidOn ?? 'undated';
      const n = (counters.get(key) ?? 0) + 1;
      counters.set(key, n);
      return {
        slug: slugForEntry(entry.saidOn, n),
        sectionIndex: entry.sectionIndex,
        saidOn: entry.saidOn,
        era,
        imageSrc: entry.imageUrls[0] ?? null,
        lines: entry.lines.map((line, index) => {
          const single = line.speakerLabel !== null && !isGroupLabel(line.speakerLabel);
          return {
            position: index + 1,
            kind: line.kind,
            speakerName:
              single && line.speakerLabel ? speakers.canonicalName(line.speakerLabel) : null,
            speakerLabel: single ? null : line.speakerLabel,
            text: line.text,
          };
        }),
      };
    });
}
