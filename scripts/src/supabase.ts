import { createClient } from '@supabase/supabase-js';
import type { Database } from '@aaronisms/db/database.types';

export type Db = ReturnType<typeof createServiceClient>;

/**
 * The role of a Supabase API key: `anon` for a publishable key (`sb_publishable_...`, not a JWT),
 * `service_role` for a secret key (`sb_secret_...`), else the `role` claim of a legacy JWT key, or
 * null if it is none of these.
 */
export function keyRole(key: string): string | null {
  if (key.startsWith('sb_publishable_')) return 'anon';
  if (key.startsWith('sb_secret_')) return 'service_role';
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString());
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export type ServiceTarget = { url: string; host: string; key: string };

/**
 * The project and key a data job writes with. Reads SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 * and SUPABASE_SERVICE_ROLE_KEY, and refuses a key whose role is not `service_role`, since an
 * anon key makes deletes match nothing and fails halfway. Callers print `host` before writing.
 */
export function serviceTarget(): ServiceTarget {
  const rawUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!rawUrl || !key) {
    throw new Error(
      'Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  const role = keyRole(key);
  if (role !== 'service_role') {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY is not a service role key (its role is ${role ?? 'unreadable'}). Use the secret key (or the legacy service_role JWT).`,
    );
  }
  const url = projectUrl(rawUrl);
  return { url, host: new URL(url).host, key };
}

/** Service-role client for one-off data jobs. */
export function createServiceClient(target: ServiceTarget = serviceTarget()) {
  return createClient<Database>(target.url, target.key, { auth: { persistSession: false } });
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
