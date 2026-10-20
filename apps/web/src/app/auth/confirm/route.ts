import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { isMagicLinkSession } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';
import { createSessionClient } from '@/lib/supabase/session';

/**
 * Finishes the magic-link sign-in from the emailed token hash. Unlike the PKCE code that
 * /auth/callback takes, the hash needs nothing stored in the browser that asked for the link, so
 * the link works in any browser or device (a phone's mail app, say). Only a moderator may stay
 * signed in; anyone else is signed straight back out.
 */
export async function GET(request: NextRequest) {
  const login = (error: string) =>
    NextResponse.redirect(new URL(`/admin/login?error=${error}`, request.url));
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  if (!tokenHash || (type !== 'email' && type !== 'magiclink')) return login('link');

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type satisfies EmailOtpType,
  });
  if (error || !data.user) return login('link');

  if (!getServerEnv().isModerator(data.user.email ?? '') || !(await isMagicLinkSession(supabase))) {
    await supabase.auth.signOut({ scope: 'local' });
    return login('forbidden');
  }
  return NextResponse.redirect(new URL('/admin', request.url));
}
