import type { Metadata } from 'next';
import { SubmitForm } from '@/features/submissions/components/SubmitForm';
import { getSpeakerNames } from '@/features/submissions/queries';
import { getServerEnv } from '@/lib/env';

export const metadata: Metadata = { title: 'Submit an Aaronism' };

// Needs Supabase and the server environment at request time, never at build time.
export const dynamic = 'force-dynamic';

export default async function SubmitPage() {
  const { turnstileSiteKey } = getServerEnv();
  const speakers = await getSpeakerNames();
  return (
    <>
      <h1 className="text-3xl font-light tracking-tight sm:text-4xl">Submit an Aaronism</h1>
      <p className="text-muted-foreground mt-2 mb-6">
        Add something that was said. It is reviewed by a moderator before it appears.
      </p>
      <div className="bg-card border-border rounded-md border p-5 shadow-xs sm:p-6">
        <SubmitForm speakers={speakers} turnstileSiteKey={turnstileSiteKey} />
      </div>
    </>
  );
}
