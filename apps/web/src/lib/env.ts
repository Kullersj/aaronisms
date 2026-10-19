import { z } from 'zod';
import type { EmailConfig } from '@aaronisms/email';

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

const serverEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    /** Public origin of the site, used in emailed links and the sign-in redirect. */
    SITE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
    MODERATOR_EMAILS: moderatorEmailsSchema,
    TURNSTILE_SECRET_KEY: z.string().min(1),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
    EMAIL_TRANSPORT: z.enum(['resend', 'smtp']).default('resend'),
    EMAIL_FROM: z.string().min(1),
    RESEND_API_KEY: z.string().min(1).optional(),
    /** Local Mailpit by default; set it to point `smtp` at another server. */
    EMAIL_SMTP_URL: z.string().min(1).default('smtp://127.0.0.1:54325'),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_TRANSPORT === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'Required for resend' });
    }
  });

function emailConfig(env: z.infer<typeof serverEnvSchema>): EmailConfig {
  return env.EMAIL_TRANSPORT === 'smtp'
    ? { transport: 'smtp', url: env.EMAIL_SMTP_URL, from: env.EMAIL_FROM }
    : { transport: 'resend', apiKey: env.RESEND_API_KEY ?? '', from: env.EMAIL_FROM };
}

/** Validates a raw environment for server code. Exported for tests; use `getServerEnv`. */
export function parseServerEnv(source: Record<string, string | undefined>) {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(
      `Missing or invalid environment variables: ${names.join(', ')}. ` +
        'Copy .env.example to apps/web/.env.local and fill them in.',
    );
  }
  const env = result.data;
  const [defaultModerator = ''] = env.MODERATOR_EMAILS;
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    siteUrl: env.SITE_URL,
    moderatorEmails: env.MODERATOR_EMAILS,
    defaultModerator,
    turnstileSecretKey: env.TURNSTILE_SECRET_KEY,
    turnstileSiteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    email: emailConfig(env),
  };
}

let cached: ReturnType<typeof parseServerEnv> | undefined;

/**
 * Validated server environment, computed on first call so that `next build`
 * works without env vars. Call only from server code.
 */
export function getServerEnv() {
  return (cached ??= parseServerEnv(process.env));
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
