import { Button } from '@aaronisms/ui/button';
import { Input } from '@aaronisms/ui/input';
import { Select } from '@aaronisms/ui/select';
import { mergeSpeakers, renameSpeaker } from '../actions';
import type { SpeakerSummary } from '../queries';

export type SpeakerRowProps = {
  speaker: SpeakerSummary;
  /** Every other speaker, as merge targets. */
  others: SpeakerSummary[];
};

export function SpeakerRow({ speaker, others }: SpeakerRowProps) {
  return (
    <li className="bg-card border-border flex flex-col gap-3 rounded-md border p-4">
      <p className="text-sm">
        <strong className="font-semibold">{speaker.name}</strong>
        <span className="text-muted-foreground">
          {' '}
          · {speaker.lineCount} {speaker.lineCount === 1 ? 'line' : 'lines'}
        </span>
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action={renameSpeaker} className="flex flex-1 gap-2">
          <input type="hidden" name="speakerId" value={speaker.id} />
          <Input
            name="name"
            defaultValue={speaker.name}
            aria-label={`New name for ${speaker.name}`}
          />
          <Button type="submit" variant="outline">
            Rename
          </Button>
        </form>
        <form action={mergeSpeakers} className="flex flex-1 gap-2">
          <input type="hidden" name="speakerId" value={speaker.id} />
          <Select name="into" defaultValue="" aria-label={`Merge ${speaker.name} into`}>
            <option value="" disabled>
              Merge into…
            </option>
            {others.map((other) => (
              <option key={other.id} value={other.id}>
                {other.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Merge
          </Button>
        </form>
      </div>
    </li>
  );
}
