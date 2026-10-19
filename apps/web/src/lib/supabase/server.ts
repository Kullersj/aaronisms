import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@aaronisms/db/database.types';
import { getPublicEnv } from '@/lib/env';

/**
 * Anonymous, read-only Supabase client for server code. It carries no session, so it is safe
 * inside cached functions. Row-level security limits it to published content.
 */
export function createAnonClient() {
  const env = getPublicEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
