import { assertLocalSupabaseUrl } from '@aaronisms/db/testing/local-only';

/** Reads a variable the submission and moderation journeys need, with a clear error if it is unset. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} must be set to run the submission and moderation e2e tests (see the README).`,
    );
  }
  return value;
}

/**
 * SUPABASE_URL for the service-role client, after checking it is a local stack (or that
 * ALLOW_REMOTE_SUPABASE_TESTS=1 opts out). The submission, moderation and admin journeys create and
 * delete data and reset passwords, so they must not run against a real project.
 */
export function requireLocalSupabase(): string {
  const url = requireEnv('SUPABASE_URL');
  assertLocalSupabaseUrl(url);
  return url;
}

/** The moderators the running site was started with. All can use the admin; the first is the default moderator. */
export function moderators(): [string, string, ...string[]] {
  const emails = requireEnv('MODERATOR_EMAILS')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const [first, second, ...rest] = emails;
  if (!first || !second)
    throw new Error('MODERATOR_EMAILS needs at least two addresses for the e2e tests.');
  return [first, second, ...rest];
}

/** Where the signed-in admin's browser state is saved by the setup project. */
export const ADMIN_STATE = new URL('../.auth/admin.json', import.meta.url).pathname;
