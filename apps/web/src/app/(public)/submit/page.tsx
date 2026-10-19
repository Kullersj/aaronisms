import type { Metadata } from 'next';
import { SubmitFormLoader } from '@/features/submissions/components/SubmitFormLoader';

export const metadata: Metadata = { title: 'Submit an Aaronism' };

// Needs Supabase and the server environment at request time, never at build time.
export const dynamic = 'force-dynamic';

export default function SubmitPage() {
  return (
    <>
      <h1 className="text-3xl font-light tracking-tight sm:text-4xl">Submit an Aaronism</h1>
      <p className="text-muted-foreground mt-2 mb-6">
        Add something that was said. It is reviewed by a moderator before it appears.
      </p>
      <div className="bg-card border-border rounded-md border p-5 shadow-xs sm:p-6">
        <SubmitFormLoader />
      </div>
    </>
  );
}
