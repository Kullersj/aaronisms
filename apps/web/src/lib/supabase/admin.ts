import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@aaronisms/db/database.types';
import { getServerEnv } from '@/lib/env';

/**
 * Service-role Supabase client: bypasses row-level security. Server-only, and only for code that
 * has already authorised the caller (a validated submission, a moderation token or an admin
 * session). Client components may never import this file; ESLint enforces it.
 */
export function createAdminClient() {
  const env = getServerEnv();
  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
