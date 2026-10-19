import { getServerEnv } from '@/lib/env';
import { getSpeakerNames } from '../queries';
import { SubmitForm } from './SubmitForm';

/** Loads what the form needs on the server, for the full page and the dialog alike. */
export async function SubmitFormLoader() {
  const { turnstileSiteKey } = getServerEnv();
  const speakers = await getSpeakerNames();
  return <SubmitForm speakers={speakers} turnstileSiteKey={turnstileSiteKey} />;
}
