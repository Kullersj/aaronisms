/**
 * Guard for test suites that write to, and delete from, the Supabase project they point at.
 * Inherited SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY values can belong to a real project, so the
 * URL's hostname must be loopback unless the person explicitly opts out.
 */
const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
export const REMOTE_OPT_OUT = 'ALLOW_REMOTE_SUPABASE_TESTS';

/** Throws unless `url` points at the local machine or ALLOW_REMOTE_SUPABASE_TESTS=1 is set. */
export function assertLocalSupabaseUrl(
  url: string,
  env: Record<string, string | undefined> = process.env,
): void {
  if (env[REMOTE_OPT_OUT] === '1') return;
  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname;
  } catch {
    // Falls through to the error below: an unparseable URL is not known to be local.
  }
  if (hostname && LOCAL_HOSTNAMES.has(hostname.toLowerCase())) return;
  throw new Error(
    `Refusing to run: SUPABASE_URL (${hostname ?? 'not a valid URL'}) is not a local Supabase stack. ` +
      'These tests insert and delete data with the service role key. ' +
      'Unset SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to use the local stack, ' +
      `or set ${REMOTE_OPT_OUT}=1 if you really mean to run them against this project.`,
  );
}
