import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

const LOGIN_PATH = '/admin/login';

/**
 * Keeps the admin session fresh and sends signed-out visitors to the login page. This is only the
 * first gate: every admin page and action also calls `requireAdmin()`, which checks the email.
 */
export async function proxy(request: NextRequest) {
  const { user, getResponse } = await updateSession(request);
  if (!user && request.nextUrl.pathname !== LOGIN_PATH) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }
  return getResponse();
}

export const config = { matcher: ['/admin/:path*'] };
