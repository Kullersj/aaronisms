import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@aaronisms/db/database.types';
import { getPublicEnv } from '@/lib/env';

/**
 * Supabase client acting as the signed-in visitor, with the session kept in cookies. It uses the
 * anon key, so it is subject to row-level security: use it to identify who is signed in, not to
 * read or write data.
 */
export async function createSessionClient() {
  const env = getPublicEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, which cannot set cookies; the proxy refreshes them.
          }
        },
      },
    },
  );
}
