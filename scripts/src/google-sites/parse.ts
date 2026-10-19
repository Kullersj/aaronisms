import { parse, HTMLElement, TextNode, type Node } from 'node-html-parser';

export type Era = 'modern' | 'college';
export type LineKind = 'line' | 'stage' | 'context';

export type ParsedLine = {
  /** Raw speaker label as written, e.g. "Arob" or "Seth, Markoff, and Staub (in unison)". */
  speakerLabel: string | null;
  text: string;
  kind: LineKind;
};

export type ParsedEntry = {
  /**
   * 0-based position among the page's `<section>` elements, which equals the index in
   * `html.split(/<section\b/).slice(1)`. `fetch-google-site-images.mjs` records the same number.
   */
  sectionIndex: number;
  /** ISO date, or null for the undated College Years entries. */
  saidOn: string | null;
  lines: ParsedLine[];
  /** Image `src` values exactly as found; may be relative paths or remote URLs. */
  imageUrls: string[];
};

/**
 * Everything that depends on Google Sites' generated markup lives here. If Google changes the
 * class names, this is the only thing to update. The classes below come from saved pages.
 *
 * - Each entry is a `<section class="yaqOZd">`. The first section is the site header (an `<h1>`
 *   title and the tagline) and is skipped.
 * - A dated entry has a heading (`<h2>`) whose date text sits in trailing `<span>`s, after a
 *   "Copy heading link" button. The date can be split across several spans.
 * - Lines are `<p>` elements made of inline-styled `<span>`s: bold for the speaker, italic for
 *   the quote. A `<br>` starts a new line inside the same paragraph.
 * - Images are `<img>` elements somewhere inside the section, after the text.
 */
const SELECTORS = {
  entry: 'section.yaqOZd',
  siteTitle: 'h1',
  heading: 'h2, h3, [role="heading"]',
  headingNoise: 'svg, [role="button"], [aria-hidden="true"], button',
  paragraph: 'p',
  image: 'img',
} as const;

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

type Segment = { text: string; bold: boolean; italic: boolean };
type Piece = Segment | 'break';

const isBoldStyle = (style: string) => /font-weight:\s*(?:bold|[6-9]00)/i.test(style);
const isItalicStyle = (style: string) => /font-style:\s*(?:italic|oblique)/i.test(style);

function collectPieces(node: Node, bold: boolean, italic: boolean, out: Piece[]): void {
  if (node instanceof TextNode) {
    out.push({ text: node.text, bold, italic });
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  const tag = node.tagName;
  if (tag === 'BR') {
    out.push('break');
    return;
  }
  if (tag === 'IMG' || tag === 'SVG') return;
  const style = node.getAttribute('style') ?? '';
  const nextBold = bold || tag === 'B' || tag === 'STRONG' || isBoldStyle(style);
  const nextItalic = italic || tag === 'I' || tag === 'EM' || isItalicStyle(style);
  for (const child of node.childNodes) collectPieces(child, nextBold, nextItalic, out);
}

/** Splits a paragraph into physical lines at `<br>`, each a list of styled text segments. */
function paragraphLines(p: HTMLElement): Segment[][] {
  const pieces: Piece[] = [];
  collectPieces(p, false, false, pieces);
  const lines: Segment[][] = [[]];
  for (const piece of pieces) {
    if (piece === 'break') lines.push([]);
    else lines[lines.length - 1]?.push(piece);
  }
  return lines;
}

const clean = (text: string) => text.replace(/[\s\u00a0]+/g, ' ').trim();

/** True for labels naming several people or a crowd rather than one speaker. */
export function isGroupLabel(label: string): boolean {
  return (
    /[,&()]|\band\b/i.test(label) ||
    /^(everyone|everybody|all|both|the group|others?)\b/i.test(label.trim())
  );
}

function cleanLabel(label: string): string {
  return clean(label.replace(/[*"“”]/g, ''));
}

/**
 * Speaker label and remaining text for a line that starts "Name:", or null.
 *
 * Styled lines have the name in bold, optionally with a plain parenthetical such as
 * "(in unison)", and the colon in either style. Unstyled "Name: text" lines are accepted
 * only when the label looks like a name.
 */
function splitSpeaker(segments: Segment[]): { label: string; rest: string } | null {
  const chars = segments.flatMap((s) => [...s.text].map((ch) => ({ ch, bold: s.bold })));
  const colon = chars.findIndex((c) => c.ch === ':');
  const firstReal = chars.find((c) => clean(c.ch) !== '');
  if (colon === -1 || !firstReal) return null;

  const before = chars.slice(0, colon);
  const label = cleanLabel(before.map((c) => c.ch).join(''));
  const rest = chars
    .slice(colon + 1)
    .map((c) => c.ch)
    .join('');

  if (firstReal.bold) {
    let depth = 0;
    const nameOnly = before.every(({ ch, bold }) => {
      if (ch === '(') depth++;
      const ok = bold || depth > 0 || clean(ch) === '';
      if (ch === ')') depth--;
      return ok;
    });
    return nameOnly && label ? { label, rest } : null;
  }

  // "At 9:11 PM:" and "Leaving the hardware store:" must not count as speakers.
  const looksLikeName =
    /^\p{Lu}/u.test(label) &&
    !/\d/.test(label) &&
    label.split(' ').length <= 6 &&
    /^[\s\u00a0]/.test(rest) &&
    clean(rest) !== '' &&
    !segments.some((s) => s.bold);
  return looksLikeName ? { label, rest } : null;
}

const wrappedInAsterisks = (text: string) => /^\*[^*].*\*$/s.test(text);
const stripAsterisks = (text: string) => clean(text.replace(/^\*+|\*+$/g, ''));

function parseLine(segments: Segment[]): ParsedLine | null {
  const speaker = splitSpeaker(segments);
  if (speaker) {
    const text = clean(speaker.rest);
    return text && speaker.label ? { speakerLabel: speaker.label, text, kind: 'line' } : null;
  }

  const text = clean(segments.map((s) => s.text).join(''));
  if (!text) return null;
  if (wrappedInAsterisks(text))
    return { speakerLabel: null, text: stripAsterisks(text), kind: 'stage' };
  if (text.endsWith(':')) return { speakerLabel: null, text, kind: 'context' };
  // Italics are how the site styles quoted speech, so an italic-only line is someone speaking whose
  // name was not written down. Plain unattributed text is narration or setup.
  // Stray punctuation such as a bold opening quote mark does not break that.
  const allItalic = segments.every((s) => s.italic || !/[\p{L}\p{N}]/u.test(s.text));
  return { speakerLabel: null, text, kind: allItalic ? 'line' : 'context' };
}

const DATE_TEXT = /([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/;

/** True when a heading reads like "Month D, YYYY", so other section headings can be skipped. */
function looksLikeDate(raw: string): boolean {
  const match = DATE_TEXT.exec(clean(raw));
  return MONTHS.includes((match?.[1] ?? '').toLowerCase());
}

/** Converts "October 6, 2025" (any spacing, optional ordinal) to `2025-10-06`. */
export function parseDateText(raw: string): string {
  const text = clean(raw);
  const match = DATE_TEXT.exec(text);
  const month = MONTHS.indexOf((match?.[1] ?? '').toLowerCase());
  if (!match || month === -1) throw new Error(`Unrecognised date heading: "${text}"`);
  const year = Number(match[3]);
  const day = Number(match[2]);
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    throw new Error(`Invalid calendar date in heading: "${text}"`);
  }
  return date.toISOString().slice(0, 10);
}

/**
 * The date text sits in several adjacent spans that can split mid-word ("October 6" + ", 202" +
 * "5"), so text nodes are joined with no separator and only then whitespace-collapsed.
 */
function headingText(heading: HTMLElement): string {
  const copy = parse(heading.outerHTML).querySelector(SELECTORS.heading) ?? heading;
  for (const noise of copy.querySelectorAll(SELECTORS.headingNoise)) noise.remove();
  return copy.text;
}

function parseEntry(
  section: HTMLElement,
  sectionIndex: number,
  saidOn: string | null,
): ParsedEntry {
  const lines = section
    .querySelectorAll(SELECTORS.paragraph)
    .flatMap(paragraphLines)
    .map(parseLine)
    .filter((line): line is ParsedLine => line !== null);
  const imageUrls = section
    .querySelectorAll(SELECTORS.image)
    .map((img) => img.getAttribute('src'))
    .filter((src): src is string => Boolean(src));
  return { sectionIndex, saidOn, lines, imageUrls };
}

/**
 * Parses a saved Google Sites page into entries, in page order.
 *
 * - `modern`: only sections with a date heading are entries; others (header, nav, other headings)
 *   are skipped.
 * - `college`: pages have no dates, so every section with content is one undated entry.
 */
export function parseGoogleSitesPage(html: string, era: Era): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  for (const [index, section] of parse(html).querySelectorAll('section').entries()) {
    if (!section.matches(SELECTORS.entry) || section.querySelector(SELECTORS.siteTitle)) continue;
    if (era === 'college') {
      const entry = parseEntry(section, index, null);
      if (entry.lines.length > 0) entries.push(entry);
      continue;
    }
    const heading = section.querySelector(SELECTORS.heading);
    if (!heading) continue;
    const text = headingText(heading);
    if (!looksLikeDate(text)) {
      console.warn(`Skipping section ${index}: heading is not a date: "${clean(text)}"`);
      continue;
    }
    entries.push(parseEntry(section, index, parseDateText(text)));
  }
  return entries;
}

/** Content images are hosted on googleusercontent or saved next to the page in `<name>_files/`. */
const CONTENT_IMAGE = /^https:\/\/lh\d*(?:-\w+)?\.googleusercontent\.com\/|(?:^|\/)[^/]+_files\//i;

/**
 * Every content image on a page with the section it sits in and its position within that section
 * (the `order` that `fetch-google-site-images.mjs` records). Used for the memes page.
 */
export function parseImages(html: string): { sectionIndex: number; order: number; src: string }[] {
  return parse(html)
    .querySelectorAll('section')
    .flatMap((section, sectionIndex) =>
      section
        .querySelectorAll(SELECTORS.image)
        .map((img) => img.getAttribute('src'))
        .filter((src): src is string => Boolean(src) && CONTENT_IMAGE.test(src ?? ''))
        .map((src, order) => ({ sectionIndex, order, src })),
    );
}
