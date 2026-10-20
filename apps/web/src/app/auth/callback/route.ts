import { NextResponse, type NextRequest } from 'next/server';
import { isMagicLinkSession } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';
import { createSessionClient } from '@/lib/supabase/session';

/**
 * Finishes the magic-link sign-in: trades the one-time code for a session cookie. Only a moderator
 * may stay signed in; anyone else is signed straight back out.
 */
export async function GET(request: NextRequest) {
  const login = (error: string) =>
    NextResponse.redirect(new URL(`/admin/login?error=${error}`, request.url));
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return login('link');

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return login('link');

  if (!getServerEnv().isModerator(data.user.email ?? '') || !(await isMagicLinkSession(supabase))) {
    await supabase.auth.signOut({ scope: 'local' });
    return login('forbidden');
  }
  return NextResponse.redirect(new URL('/admin', request.url));
}
