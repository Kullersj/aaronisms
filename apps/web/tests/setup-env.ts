// Integration tests run against the local Supabase stack and its Mailpit. The shared global setup
// sets SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY; fill in the rest of the
// server environment for local use.
const env = process.env;
env.NEXT_PUBLIC_SUPABASE_URL ??= env.SUPABASE_URL;
env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= env.SUPABASE_ANON_KEY;
env.SITE_URL ??= 'http://localhost:3000';
env.MODERATOR_EMAILS ??= 'first@example.com, second@example.com';
env.TURNSTILE_SECRET_KEY ??= '1x0000000000000000000000000000000AA';
env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??= '1x00000000000000000000AA';
env.EMAIL_TRANSPORT ??= 'smtp';
env.EMAIL_FROM ??= 'Aaronisms <noreply@example.com>';
