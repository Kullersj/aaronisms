import type { EntryLine } from '@aaronisms/db/schemas';
import { formatStageDirection } from '../utils';

export type DialogueLineProps = { line: EntryLine };

export function DialogueLine({ line }: DialogueLineProps) {
  if (line.kind === 'stage') {
    return <p className="text-muted-foreground italic">{formatStageDirection(line.text)}</p>;
  }
  if (line.kind === 'context') {
    return <p>{line.text}</p>;
  }
  const speaker = line.speaker?.name ?? line.speakerLabel;
  return (
    <p>
      {speaker ? <strong className="font-semibold">{speaker}:</strong> : null} <em>{line.text}</em>
    </p>
  );
}
