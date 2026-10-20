import type { Entry, EntryEdit, EntryEditLine, LineKind } from '@aaronisms/db/schemas';
import { slugForSpeaker } from '@aaronisms/db/slug';

/** Shape the database functions take for each line (position comes from the array order). */
export type LinePayload = {
  kind: 'line' | 'stage' | 'context';
  speaker_id: string | null;
  speaker_label: string | null;
  text: string;
};

/** A line from a submission or an edit; only edits of existing entries carry `speakerLabel`. */
type InputLine = {
  kind: LineKind;
  speaker: string | null;
  speakerLabel?: string | null;
  text: string;
};

type LinesInput = { context?: string; lines: InputLine[] };

/** True for a group label ("Everyone else") loaded from an entry and left unchanged. */
function keepsLabel(line: InputLine): boolean {
  return line.kind === 'line' && Boolean(line.speakerLabel) && line.speaker === line.speakerLabel;
}

/** Distinct speaker names used by spoken lines, by speaker slug (so "A Rob" and "a-rob" match). */
export function speakerNamesBySlug(lines: InputLine[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const line of lines) {
    if (line.kind !== 'line' || !line.speaker || keepsLabel(line)) continue;
    const slug = slugForSpeaker(line.speaker);
    if (slug && !names.has(slug)) names.set(slug, line.speaker);
  }
  return names;
}

/**
 * Turns validated form input into database lines. A setup line comes first. Names that resolve to
 * a speaker become `speaker_id`; a name with nothing to slug (such as "???") stays as a label, and
 * so does an unchanged group label. Speakerless lines and setup lines in the middle stay as they are.
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
    const speakerId =
      isSpoken && !keepsLabel(line)
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
 * Form values for editing an existing entry. A leading setup line fills the setup field; every
 * other line keeps its kind. A group label becomes the speaker text, remembered in `speakerLabel`
 * so saving it unchanged writes it back as a label.
 */
export function entryToEditValues(entry: Entry): EntryEdit {
  const [first, ...rest] = entry.lines;
  const hasContext = first?.kind === 'context';
  const lines = (hasContext ? rest : entry.lines).map((line): EntryEditLine => {
    const label = line.speaker ? null : line.speakerLabel;
    return {
      kind: line.kind,
      speaker: line.kind === 'line' ? (line.speaker?.name ?? label) : null,
      speakerLabel: label,
      text: line.text,
    };
  });
  return { saidOn: entry.saidOn, context: hasContext ? first.text : '', lines };
}
