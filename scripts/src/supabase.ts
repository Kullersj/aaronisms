import { createClient } from '@supabase/supabase-js';
import type { Database } from '@aaronisms/db/database.types';

export type Db = ReturnType<typeof createServiceClient>;

/** Service-role client for one-off data jobs. Reads SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL). */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return createClient<Database>(projectUrl(url), key, { auth: { persistSession: false } });
}

/**
 * The project URL the client expects: just the origin, like https://abc.supabase.co. Copying the
 * "RESTful endpoint" from the dashboard adds /rest/v1, which the API answers with "Invalid path
 * specified in request URL", so that suffix and trailing slashes are dropped. Anything else is an error.
 */
export function projectUrl(raw: string): string {
  const trimmed = raw
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '');
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`SUPABASE_URL is not a URL: ${raw}`);
  }
  if (!/^https?:$/.test(url.protocol) || url.pathname !== '/' || url.search) {
    throw new Error(
      `SUPABASE_URL should be the project URL, like https://<project-ref>.supabase.co, not ${raw}`,
    );
  }
  return url.origin;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Throws with context when a Supabase call returns an error. */
export function check<T>(
  result: { data: T; error: { message: string } | null },
  action: string,
): T {
  if (result.error) throw new Error(`${action}: ${result.error.message}`);
  return result.data;
}
