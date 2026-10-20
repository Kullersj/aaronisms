# Launch checklist

What is left for Seth, in order. The code is finished; every step here is an account setting, a secret or a DNS record. Details live in the [README](../README.md).

## 1. Supabase (hosted project)

1. In Project Settings, Integrations, connect the GitHub repository with the Supabase directory set to `packages/db`, so merging to `main` applies the migrations. Confirm the migrations ran (Database, Migrations).
2. Authentication, Sign In / Providers: turn **off** "Allow new users to sign up" (see [Submissions, moderation and admin](../README.md#submissions-moderation-and-admin)).
3. Database, Backups: turn on the backups your plan offers. The scheduled dump in step 4 is the second copy.

## 2. Resend

Verify a sending domain (SPF and DKIM records) and create an API key. `EMAIL_FROM` must use that domain.

## 3. Vercel

Set these for **Production**: `SITE_URL` (the public origin, `https://www.aaronisms.net`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (a real Cloudflare Turnstile widget), `RESEND_API_KEY`, `EMAIL_FROM`, `MODERATOR_EMAILS` (every address can sign in to the admin; the first is the default moderator, who gets failure alerts and is the `Reply-To`). Leave `EMAIL_TRANSPORT` unset: production refuses to start with `smtp` or the Turnstile test keys.

Set copies for **Preview** with Cloudflare's test keys (`1x0000000000000000000000000000000AA` and `1x00000000000000000000AA`), so previews can submit without real Turnstile, and with the preview's own `SITE_URL` if you want working moderation links there.

## 4. GitHub secrets

Settings, Secrets and variables, Actions. Both workflows skip with a warning until their secrets exist (a manual run fails, so a missing secret is obvious). See [Keep-alive and backups](../README.md#keep-alive-and-backups).

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the publishable key, or the legacy anon key; never a secret or service role key) for the keep-alive.
- `SUPABASE_DB_URL` for the daily backup (use the Session pooler string, since GitHub runners have no IPv6).
- `BACKUP_PASSPHRASE`, a long random passphrase that encrypts the backup (the repository is public, so its artifacts are downloadable). Keep a copy outside GitHub, in a password manager: without it the backups cannot be read.

Run each workflow once from the Actions tab (Run workflow) to confirm it is green.

GitHub disables scheduled workflows in a public repository after 60 days without repository activity. Watch for the "scheduled workflow disabled" email and re-enable them from the Actions tab (any push also resets the timer), or the keep-alive and backups stop silently.

## 5. Import and verify

Seth runs the real import with the service role key; see [Importing the old Google Sites content](../README.md#importing-the-old-google-sites-content). Do the dry run first, then check the counts, and look through the site and `/admin`.

## 6. Check Row Level Security on the hosted project

The pending/rejected checks prove nothing while the project has no private rows, so:

1. Submit a test entry through `/submit` on the hosted site and leave it pending.
2. Run the check with the publishable key (Project Settings, API Keys; or the legacy anon key):

```sh
pnpm check:rls --url https://<project>.supabase.co --anon-key <publishable key>
```

3. Reject the test entry from `/admin`.

It must print "All ... checks passed." See [Checking Row Level Security](../README.md#checking-row-level-security).

## 7. DNS and the old site

1. In Vercel, add `www.aaronisms.net` and the apex `aaronisms.net` (redirecting to `www`).
2. At the registrar: `CNAME www` to `cname.vercel-dns.com`, and the apex record Vercel shows.
3. Remove the custom domain from Google Sites once the new site answers on `www`.
4. Check that `/home`, `/the-college-years` and `/dont-let-your-memes-be-dreams` redirect, and that a share link unfurls.
5. Optional: if Google had indexed the old Google Sites URLs, use Search Console's Removals tool once.

## 8. Retire the Google Form

After the import is verified, stop accepting responses on the Form and archive the response Sheet.
