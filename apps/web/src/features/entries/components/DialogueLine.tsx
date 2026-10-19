import Link from 'next/link';
import type { EntryLine } from '@aaronisms/db/schemas';
import { highlightSegments } from '@/features/search/utils';
import { formatStageDirection } from '../utils';

export type DialogueLineProps = {
  line: EntryLine;
  /** Words to mark, for search results. */
  highlight?: string[];
};

function Marked({ text, terms }: { text: string; terms: string[] | undefined }) {
  if (!terms || terms.length === 0) return text;
  return highlightSegments(text, terms).map((segment, index) =>
    segment.match ? (
      <mark
        key={index}
        className="rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/40"
      >
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
}

export function DialogueLine({ line, highlight }: DialogueLineProps) {
  if (line.kind === 'stage') {
    return (
      <p className="text-muted-foreground italic">
        <Marked text={formatStageDirection(line.text)} terms={highlight} />
      </p>
    );
  }
  if (line.kind === 'context') {
    return (
      <p>
        <Marked text={line.text} terms={highlight} />
      </p>
    );
  }
  return (
    <p>
      {line.speaker ? (
        <strong className="font-semibold">
          <Link
            href={`/speakers/${line.speaker.slug}`}
            className="focus-visible:ring-ring rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {line.speaker.name}:
          </Link>
        </strong>
      ) : line.speakerLabel ? (
        <strong className="font-semibold">{line.speakerLabel}:</strong>
      ) : null}{' '}
      <em>
        <Marked text={line.text} terms={highlight} />
      </em>
    </p>
  );
}
