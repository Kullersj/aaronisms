import { z } from 'zod';

const emailList = z.string().transform((value, ctx) => {
  const emails = [
    ...new Set(
      value
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const invalid = emails.find((email) => !z.email().safeParse(email).success);
  if (invalid) {
    ctx.addIssue({ code: 'custom', message: `Invalid email address: ${invalid}` });
    return z.NEVER;
  }
  return emails;
});

export const moderatorEmailsSchema = emailList.pipe(
  z.array(z.string()).min(1, 'At least one moderator email is required'),
);

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MODERATOR_EMAILS: moderatorEmailsSchema,
  RESEND_API_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
});

let cached: ReturnType<typeof parseServerEnv> | undefined;

function parseServerEnv() {
  const { MODERATOR_EMAILS, ...env } = serverEnvSchema.parse(process.env);
  const [defaultModerator = ''] = MODERATOR_EMAILS;
  return { ...env, moderatorEmails: MODERATOR_EMAILS, defaultModerator };
}

/**
 * Validated server environment, computed on first call so that `next build`
 * works without env vars. Call only from server code.
 */
export function getServerEnv() {
  return (cached ??= parseServerEnv());
}

let cachedPublic: z.infer<typeof publicEnvSchema> | undefined;

/**
 * Only the two public Supabase variables the read-only pages need, so the public site
 * does not require the server-only secrets. Read at request time, never at import time.
 * Call only from server code.
 */
export function getPublicEnv() {
  if (cachedPublic) return cachedPublic;
  const result = publicEnvSchema.safeParse(process.env);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(
      `Missing or invalid environment variables: ${names.join(', ')}. ` +
        'Copy .env.example to apps/web/.env.local and fill them in.',
    );
  }
  return (cachedPublic = result.data);
}
