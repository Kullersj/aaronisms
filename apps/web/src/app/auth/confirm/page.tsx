import type { Metadata } from 'next';
import { Button } from '@aaronisms/ui/button';
import { PageShell } from '@/components/layout/PageShell';
import { confirmSignIn } from '@/features/admin/actions';

// The one-time token is in the URL, so keep it out of Referer headers sent to other origins.
export const metadata: Metadata = { title: 'Admin sign in', referrer: 'no-referrer' };

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ token_hash?: string; type?: string }> };

/**
 * Where the sign-in email links to. Opening it only shows a button: the one-time token is spent by
 * the POST, so mail scanners that fetch links to check them cannot use it up.
 */
export default async function ConfirmSignInPage({ searchParams }: PageProps) {
  const { token_hash: tokenHash = '', type = '' } = await searchParams;
  return (
    <PageShell title="Admin sign in">
      <form action={confirmSignIn} className="flex flex-col gap-4">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <p className="text-muted-foreground">Finish signing in to the Aaronisms admin.</p>
        <Button type="submit" className="self-start">
          Sign in
        </Button>
      </form>
    </PageShell>
  );
}
