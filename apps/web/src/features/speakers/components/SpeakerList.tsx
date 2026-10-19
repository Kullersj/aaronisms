import Link from 'next/link';
import { Card } from '@aaronisms/ui/card';
import type { PublicSpeaker } from '../queries';

export type SpeakerListProps = { speakers: PublicSpeaker[] };

export function SpeakerList({ speakers }: SpeakerListProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {speakers.map((speaker) => (
        <li key={speaker.id}>
          <Card className="hover:bg-accent focus-within:ring-ring transition-colors focus-within:ring-2">
            <Link
              href={`/speakers/${speaker.slug}`}
              className="flex items-baseline justify-between gap-3 rounded-md px-5 py-4 focus-visible:outline-none"
            >
              <span className="text-lg font-medium">{speaker.name}</span>
              <span className="text-muted-foreground text-sm">
                {speaker.lineCount} {speaker.lineCount === 1 ? 'line' : 'lines'}
              </span>
            </Link>
          </Card>
        </li>
      ))}
    </ul>
  );
}
