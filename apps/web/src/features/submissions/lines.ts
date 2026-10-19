import type { Entry, EntryEdit, NewSubmissionLine } from '@aaronisms/db/schemas';
import { slugForSpeaker } from '@aaronisms/db/slug';

/** Shape the database functions take for each line (position comes from the array order). */
export type LinePayload = {
  kind: 'line' | 'stage' | 'context';
  speaker_id: string | null;
  speaker_label: string | null;
  text: string;
};

type LinesInput = { context?: string; lines: NewSubmissionLine[] };

/** Distinct speaker names used by spoken lines, by speaker slug (so "A Rob" and "a-rob" match). */
export function speakerNamesBySlug(lines: NewSubmissionLine[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const line of lines) {
    if (line.kind !== 'line' || !line.speaker) continue;
    const slug = slugForSpeaker(line.speaker);
    if (slug && !names.has(slug)) names.set(slug, line.speaker);
  }
  return names;
}

/**
 * Turns validated form input into database lines. A setup line comes first. Names that resolve to
 * a speaker become `speaker_id`; a name with nothing to slug (such as "???") stays as a label.
 */
export function buildLinePayload(
  input: LinesInput,
  speakerIds: Map<string, string>,
): LinePayload[] {
  const context = input.context?.trim();
  const payload: LinePayload[] = context
    ? [{ kind: 'context', speaker_id: null, speaker_label: null, text: context }]
    : [];
  for (const line of input.lines) {
    const isSpoken = line.kind === 'line' && line.speaker !== null;
    const speakerId = isSpoken
      ? (speakerIds.get(slugForSpeaker(line.speaker ?? '')) ?? null)
      : null;
    payload.push({
      kind: line.kind,
      speaker_id: speakerId,
      speaker_label: isSpoken && !speakerId ? line.speaker : null,
      text: line.text,
    });
  }
  return payload;
}

/**
 * Form values for editing an existing entry. A leading setup line fills the setup field; any other
 * setup lines become stage directions, since the line editor offers only lines and directions.
 */
export function entryToEditValues(entry: Entry): EntryEdit {
  const [first, ...rest] = entry.lines;
  const hasContext = first?.kind === 'context';
  const lines = (hasContext ? rest : entry.lines).map((line) => ({
    kind: line.kind === 'line' ? ('line' as const) : ('stage' as const),
    speaker: line.kind === 'line' ? (line.speaker?.name ?? line.speakerLabel) : null,
    text: line.text,
  }));
  return { saidOn: entry.saidOn, context: hasContext ? first.text : '', lines };
}
