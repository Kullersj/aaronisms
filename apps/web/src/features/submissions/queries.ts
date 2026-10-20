import 'server-only';
import { getPublicSpeakers } from '@/features/speakers/queries';

/** Names of speakers on published entries, for autocomplete. Refreshed when entries change. */
export async function getSpeakerNames(): Promise<string[]> {
  return (await getPublicSpeakers()).map((speaker) => speaker.name);
}
