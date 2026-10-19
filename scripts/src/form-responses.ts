export type FormColumns = {
  timestamp: string;
  who: string;
  what: string;
  name: string;
};

export const DEFAULT_COLUMNS: FormColumns = {
  timestamp: 'Timestamp',
  who: 'Who said it?',
  what: 'What was said?',
  name: 'Your name',
};

export type PendingLine = {
  position: number;
  kind: 'line' | 'context';
  speaker: string | null;
  text: string;
};

export type PendingSubmission = {
  /** ISO date taken from the response timestamp. */
  saidOn: string;
  submittedBy: string | null;
  lines: PendingLine[];
};

const SPEAKER_LINE = /^([^:\n]{1,60}?):\s+(\S.*)$/;

/** Turns a Google Sheets timestamp ("10/18/2026 14:05:33" or ISO) into `YYYY-MM-DD`, or null. */
export function dateFromTimestamp(raw: string): string | null {
  const text = raw.trim();
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  const [year, month, day] = us
    ? [us[3], us[1], us[2]]
    : iso
      ? [iso[1], iso[2], iso[3]]
      : [undefined, undefined, undefined];
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Converts one form response into a pending submission, or null when the row has no quote or no
 * usable date. A text with several "Name: words" lines becomes a multi-line dialogue; any other
 * text is a single line spoken by whoever the "Who said it?" column names.
 */
export function rowToSubmission(
  row: Record<string, string | undefined>,
  columns: FormColumns = DEFAULT_COLUMNS,
): PendingSubmission | null {
  const saidOn = dateFromTimestamp(row[columns.timestamp] ?? '');
  const what = (row[columns.what] ?? '').replace(/\r\n?/g, '\n').trim();
  if (!saidOn || !what) return null;

  const who = (row[columns.who] ?? '').trim() || null;
  const submittedBy = (row[columns.name] ?? '').trim() || null;
  const rows = what
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = rows.map((line) => SPEAKER_LINE.exec(line));
  const lines: Omit<PendingLine, 'position'>[] =
    parsed.some(Boolean) && rows.length > 1
      ? rows.map((line, i) => {
          const match = parsed[i];
          if (match?.[1] && match[2])
            return { kind: 'line', speaker: match[1].trim(), text: match[2] };
          return line.endsWith(':')
            ? { kind: 'context', speaker: null, text: line }
            : { kind: 'line', speaker: who, text: line };
        })
      : [{ kind: 'line', speaker: who, text: rows.join(' ') }];

  return { saidOn, submittedBy, lines: lines.map((line, i) => ({ ...line, position: i + 1 })) };
}
