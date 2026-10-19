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

/** The moderators the running site was started with: the first is the default moderator and admin. */
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

export const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

/** Where the signed-in admin's browser state is saved by the setup project. */
export const ADMIN_STATE = new URL('../.auth/admin.json', import.meta.url).pathname;
