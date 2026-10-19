import type { Entry } from '@aaronisms/db/schemas';

/** Longest query we send to the database. */
export const MAX_QUERY_LENGTH = 200;

/** Clean up what the visitor typed: collapse whitespace and cap the length. */
export function normalizeQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
}

/**
 * The words worth highlighting in a query written for `websearch_to_tsquery`: quotes, the `or`
 * operator and `-negated` words are dropped, and very short words are ignored.
 */
export function searchTerms(query: string): string[] {
  const terms = query
    .replace(/"/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !word.startsWith('-') && word.toLowerCase() !== 'or')
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((word) => word.length >= 2);
  return [...new Set(terms.map((term) => term.toLowerCase()))];
}

export type TextSegment = { text: string; match: boolean };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Splits `text` into plain and matching parts, case-insensitively, for `<mark>` highlighting. */
export function highlightSegments(text: string, terms: string[]): TextSegment[] {
  if (terms.length === 0) return [{ text, match: false }];
  // Longest first, so "pumpkin" wins over "pump" at the same position.
  const pattern = [...terms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(new RegExp(pattern, 'giu'))) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), match: false });
    segments.push({ text: match[0], match: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), match: false });
  return segments.length > 0 ? segments : [{ text, match: false }];
}

export type SpeakerFacet = { slug: string; name: string; count: number };

/** The speakers in these results with how many of the entries they appear in, most first. */
export function speakerFacets(entries: Entry[]): SpeakerFacet[] {
  const facets = new Map<string, SpeakerFacet>();
  for (const entry of entries) {
    const seen = new Set<string>();
    for (const line of entry.lines) {
      const speaker = line.speaker;
      if (!speaker || seen.has(speaker.slug)) continue;
      seen.add(speaker.slug);
      const facet = facets.get(speaker.slug);
      if (facet) facet.count += 1;
      else facets.set(speaker.slug, { slug: speaker.slug, name: speaker.name, count: 1 });
    }
  }
  return [...facets.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Keeps the entries in which the speaker has a line. No slug keeps everything. */
export function filterBySpeaker(entries: Entry[], speakerSlug: string | undefined): Entry[] {
  if (!speakerSlug) return entries;
  return entries.filter((entry) => entry.lines.some((line) => line.speaker?.slug === speakerSlug));
}

/** Builds `/search?q=...&speaker=...`; an empty query gives plain `/search`. */
export function searchHref(query: string, speakerSlug?: string): string {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (query && speakerSlug) params.set('speaker', speakerSlug);
  const qs = params.toString();
  return qs ? `/search?${qs}` : '/search';
}
