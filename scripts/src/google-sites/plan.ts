import { slugForEntry, slugForSpeaker } from '@aaronisms/db/slug';
import { isGroupLabel, splitAside, type Era, type LineKind, type ParsedEntry } from './parse';

/**
 * Spellings that should become one speaker. Keys are speaker slugs, the same identity the
 * database and the web app use ("A-Rob" and "a rob" both slug to "a-rob"; "Zoë" and "Zoe" to
 * "zoe"). Add new variants here; any label not listed keeps the spelling it was first seen with.
 */
const SPEAKER_ALIASES: Record<string, string> = {
  arob: 'Arob',
  'a-rob': 'Arob',
  kfed: 'KFed',
  'k-fed': 'KFed',
};

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
    /** One spelling per speaker slug, or null when the label has no slug (for example "李"). */
    canonicalName(label: string): string | null {
      const key = slugForSpeaker(label);
      if (!key) return null;
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
          // "Pat (whispering)" is Pat with an aside, which stays in front of the text.
          const { name, aside } = splitAside(line.speakerLabel ?? '');
          const single = line.speakerLabel !== null && !isGroupLabel(line.speakerLabel);
          const speakerName = single ? speakers.canonicalName(name) : null;
          // A name with no slug cannot be a speaker row, so it stays a plain label.
          const asLabel = line.speakerLabel !== null && speakerName === null;
          return {
            position: index + 1,
            kind: line.kind,
            speakerName,
            speakerLabel: asLabel ? line.speakerLabel : null,
            text: speakerName && aside ? `(${aside}) ${line.text}` : line.text,
          };
        }),
      };
    });
}
