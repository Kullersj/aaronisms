import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@aaronisms/db/database.types';
import { getPublicEnv } from '@/lib/env';

/**
 * Refreshes the Supabase session cookies for a request and reports who is signed in.
 * The returned response must be the one the proxy sends, so refreshed cookies reach the browser.
 */
export async function updateSession(request: NextRequest) {
  const env = getPublicEnv();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  return { user: data.user, getResponse: () => response };
}
