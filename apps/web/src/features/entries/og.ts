import type { Entry } from '@aaronisms/db/schemas';

export type OgLine = { speaker: string | null; text: string };

export type OgContent = {
  lines: OgLine[];
  /** True when lines or words were dropped to fit, so the image can end with an ellipsis. */
  truncated: boolean;
};

/** Cuts at a word boundary and adds an ellipsis. Counts code points, so emoji are never split. */
export function truncateText(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  const cut = chars.slice(0, Math.max(0, max - 1)).join('');
  // The cut keeps whole words only when the next character starts a gap.
  const atWord = /\s/.test(chars[max - 1] ?? '') ? cut : cut.replace(/\s+\S*$/, '');
  return `${(atWord || cut).trimEnd()}…`;
}

/**
 * Picks what fits on a social card: the spoken and context lines in order (stage directions are
 * skipped), within a total character budget and a maximum number of lines.
 */
export function ogContent(entry: Entry, maxChars = 140, maxLines = 4): OgContent {
  const candidates = entry.lines.filter((line) => line.kind !== 'stage');
  const lines: OgLine[] = [];
  let budget = maxChars;
  let truncated = false;
  for (const line of candidates) {
    if (lines.length >= maxLines || budget < 20) {
      truncated = true;
      break;
    }
    const speaker = line.kind === 'line' ? (line.speaker?.name ?? line.speakerLabel) : null;
    const text = line.text.replace(/\s+/g, ' ').trim();
    const room = budget - (speaker?.length ?? 0);
    const fitted = truncateText(text, Math.max(room, 20));
    if (fitted !== text) truncated = true;
    lines.push({ speaker, text: fitted });
    budget -= (speaker?.length ?? 0) + fitted.length;
  }
  return { lines, truncated };
}

/** Smaller type for more text, so the longest card still fits the image. */
export function ogFontSize(lines: OgLine[]): number {
  const chars = lines.reduce((n, l) => n + l.text.length + (l.speaker?.length ?? 0), 0);
  return chars > 100 ? 36 : chars > 60 ? 44 : 56;
}
