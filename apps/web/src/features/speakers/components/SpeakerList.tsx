import Link from 'next/link';
import { Card } from '@aaronisms/ui/card';
import type { Ranked } from '../points';
import type { PublicSpeaker } from '../queries';

export type SpeakerListProps = {
  speakers: Ranked<PublicSpeaker>[];
  /** Leaderboard order shows each speaker's rank; A to Z leaves it off. */
  showRank: boolean;
};

export function SpeakerList({ speakers, showRank }: SpeakerListProps) {
  const List = showRank ? 'ol' : 'ul';
  return (
    <List className="grid gap-3 sm:grid-cols-2">
      {speakers.map((speaker) => (
        <li key={speaker.id}>
          <Card className="hover:bg-accent focus-within:ring-ring transition-colors focus-within:ring-2">
            <Link
              href={`/speakers/${speaker.slug}`}
              className="flex items-baseline justify-between gap-3 rounded-md px-5 py-4 focus-visible:outline-none"
            >
              <span className="text-lg font-medium">
                {showRank && (
                  <span className="text-muted-foreground mr-2 tabular-nums">#{speaker.rank}</span>
                )}
                {speaker.name}
              </span>
              <span className="text-muted-foreground text-right text-sm">
                {speaker.points} {speaker.points === 1 ? 'point' : 'points'} · {speaker.lineCount}{' '}
                {speaker.lineCount === 1 ? 'line' : 'lines'}
              </span>
            </Link>
          </Card>
        </li>
      ))}
    </List>
  );
}
