# Aaronisms

A collection of things said. A Next.js monorepo (pnpm workspaces + Turborepo) backed by Supabase. See the migration plan for the full design; this repo is at Phase 5 (launch prep). The steps left for launch are in [docs/launch.md](docs/launch.md).

## Setup

Tool versions (Node, pnpm, Supabase CLI) are pinned in `mise.toml`.

```sh
mise install        # installs the pinned tools
mise run setup      # pnpm install, start local Supabase, generate DB types
```

Without mise, use Node >= 22 and pnpm 10.28 (`corepack enable`), then `pnpm install`. Copy `.env.example` to `.env.local` and fill in the values.

```sh
pnpm dev            # run the site at http://localhost:3000 (needs local Supabase, see below)
pnpm build          # production build
pnpm lint && pnpm typecheck && pnpm test
pnpm e2e            # Playwright against the built app (builds web first)
pnpm format         # prettier
```

For `pnpm e2e` on a fresh machine, install a browser once with `pnpm --filter @aaronisms/e2e exec playwright install chromium`. Set `BASE_URL` to test an already-running deployment, or `PW_CHROMIUM_PATH` to use an existing Chromium binary.

### Running the site locally

The public pages read published entries from Supabase at request time, so start the local stack first and point the site at it. `pnpm build` itself needs no env vars; the pages simply show an error until the two variables are set.

```sh
cd packages/db && pnpm exec supabase start && cd ../..   # applies migrations and the made-up seed
cd packages/db && pnpm exec supabase status -o env       # API_URL and ANON_KEY
```

Put them in `apps/web/.env.local` (gitignored), then `pnpm dev`:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
```

`pnpm e2e` needs the same two variables in the environment, plus the local stack running (and the extra variables under "Submissions, moderation and admin" below). Image hosts for `next/image` are derived from `NEXT_PUBLIC_SUPABASE_URL` at build time, so rebuild after changing it. Data is cached under the `entries` and `memes` tags; later phases call `revalidateTag` to refresh it.

## Submissions, moderation and admin

Everything here needs more of the server environment than the public pages (see `.env.example`). With the local stack running, add to `apps/web/.env.local`:

```sh
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>   # server only
SITE_URL=http://localhost:3000
MODERATOR_EMAILS=first@example.com, second@example.com
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA     # Cloudflare's always-pass test keys
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
EMAIL_TRANSPORT=smtp                                          # Mailpit at http://127.0.0.1:54324
EMAIL_FROM="Aaronisms <noreply@example.com>"
```

**Submitting.** `/submit` takes a date, an optional setup line, rows of speaker and line (or stage direction), an optional photo and an optional name. A Server Action validates it with the shared Zod schema, checks a honeypot field, Turnstile and a per-IP rate limit (5 per hour, kept in the database), then saves it as `pending` with the service role and emails the moderators after the response is sent. The Turnstile test secret is recognised and never sent to Cloudflare, so nothing here needs the internet.

**Moderating by email.** Every address in `MODERATOR_EMAILS` gets its own email with Approve, Reject and Edit before approving buttons. The first address is the default moderator: the `Reply-To`, and the recipient of failure alerts. Every address can sign in to `/admin`. Each button opens `/moderate/<token>`, which only displays the submission; the decision is a POST from that page, because email scanners open links. Tokens are 32 random bytes, stored only as a SHA-256 hash, valid for 14 days, and stop working if the address leaves `MODERATOR_EMAILS`. The first decision wins (`decide_entry` locks the entry row); later links say "Already approved by ...". Every decision expires the `entries` cache tag, so the site updates immediately.

**Admin.** `/admin` is a fallback behind a Supabase magic link (`/admin/login`): the pending queue, `/admin/entries/[id]` to edit any entry, and `/admin/speakers` to rename and merge speakers. Only addresses in `MODERATOR_EMAILS` are let in; `proxy.ts` refreshes the session and every page and action calls `requireAdmin()` again. Locally the sign-in email arrives in Mailpit. The email links to `/auth/confirm` with a token hash (template in `packages/db/supabase/templates/magic_link.html`; the hosted project needs the same template), so it works in any browser, not only the one that asked; `/auth/callback` still accepts the PKCE links of Supabase's default template. Sign-up is closed: the login action creates a moderator's account with the service role the first time, and a session counts as admin only if it began with a magic link (`amr` of `otp`), never a password. `config.toml` turns sign-up off for the local stack only, so **in the hosted Supabase project turn off "Allow new users to sign up"** (Authentication, Sign In / Providers) before launch. In production (`VERCEL_ENV=production`) the site also refuses to start with the Turnstile test keys or `EMAIL_TRANSPORT=smtp`.

**Email.** Templates live in `packages/email`. Preview them with hot reload:

```sh
pnpm --filter @aaronisms/email dev     # http://localhost:3001
```

`EMAIL_TRANSPORT=resend` (the default, needs `RESEND_API_KEY` and a verified `EMAIL_FROM` domain) is for production. `EMAIL_TRANSPORT=smtp` sends real SMTP to `EMAIL_SMTP_URL` (default `smtp://127.0.0.1:54325`, the local Mailpit), where you can read the messages in its web UI or API.

**Tests use the local stack.** The unit tests in `apps/web`, `packages/email`, `packages/db` and `scripts` talk to the real local Supabase and Mailpit through a shared vitest global setup (see Database below), so they need Docker running. The e2e tests also need `MODERATOR_EMAILS` (two or more addresses), `SITE_URL` and the settings above in their environment; see `.github/workflows/e2e.yml`.

## Search, speakers, random and share images

- **`/search?q=`** runs the `search_entries` database function (full-text on speaker names and lines, with a trigram fallback so typos still match), then loads the matching entries with their lines. Results are ranked, matches are marked with `<mark>`, and **speaker chips** filter them. The chips are plain links (`&speaker=<slug>`), and the header's `SearchBox` is a plain GET form, so search works without JavaScript. With JavaScript, typing on the results page updates the URL after a 300 ms pause. Search is not cached (the query is arbitrary visitor input). The trigram fallback only applies to queries of four or more characters, compares just the words that are not `-negated`, and never returns an entry that a `-word` excludes. The database reads at most the first 200 characters of a query.
- **`/speakers`** lists speakers who have at least one line in a published entry, with line counts. **`/speakers/<slug>`** shows every published entry that speaker is in. Speaker names on cards link there, and a speaker with nothing published is a 404. Both read through the anon client, so RLS keeps pending and rejected lines out of the counts.
- **`/random`** is a route handler that redirects (307, `Cache-Control: no-store`) to a published entry chosen by `random_published_entry_slug()`, or to `/` when nothing is published. The header's Random link does not prefetch it.
- **Year jump.** On phones the year list is a single scrolling row pinned to the top, and the sticky year headings sit just below it.
- **Share images.** `/a/<slug>/opengraph-image` (via `next/og`) renders the date, speakers and lines, trimmed to about 260 characters and four lines, in the header's dark style; unpublished or unknown entries get a 404. `/opengraph-image` is the default card. Next adds a content hash to these URLs, so read them from the page's `og:image` tag. They still carry the `X-Robots-Tag: noindex` header from `next.config.ts`; `tests/seo.spec.ts` checks it.

The query tests (`apps/web/tests/public-queries.test.ts`) insert their own made-up rows into the real local database and check what the anon role can and cannot see; there are no mocks. The Playwright specs for these routes are in `packages/e2e/tests/public/` (search, speakers, random, og), with page objects in `packages/e2e/pages/`.

## Launch checks, keep-alive and backups

### Checking Row Level Security

`pnpm check:rls` proves as the anon role that the database keeps private data private: pending and rejected entries, their lines and their speakers are not readable; `submitted_by`, `submitter_ip`, `reviewed_by_email` and `decision_note` cannot be selected; the moderation token and rate-limit tables cannot be read; the image bucket cannot be listed; entries, lines and speakers cannot be inserted, updated or deleted; and every write RPC (`create_submission`, `apply_entry_edits`, `merge_speakers`, `decide_entry`, `decide_entry_as_admin`, `moderation_token_state`, `consume_rate_limit`) is refused, while `search_entries` and `random_published_entry_slug` work. It exits 1 and lists each failed check.

It is safe to run against the hosted project before launch: it only reads, every write it tries is one the database must refuse (an invalid value, or the nil UUID, which matches nothing), and it refuses to run with a key whose role is not `anon` (a `sb_secret_...` or service role key is rejected).

Anon cannot see unpublished rows, so the pending, rejected, orphan-line and hidden-speaker checks pass trivially on a project that has none. They only prove something when there is at least one pending or rejected entry, so the script prints a note saying so; see the order of steps in [docs/launch.md](docs/launch.md).

```sh
pnpm check:rls --url https://<project>.supabase.co --anon-key <publishable key>
# or: SUPABASE_URL=... SUPABASE_ANON_KEY=... pnpm check:rls
```

The key is the publishable key (`sb_publishable_...`) under Project Settings, API Keys, or the legacy anon key on the legacy tab. Its test (`scripts/src/check-rls.test.ts`) runs against the local stack as part of `pnpm test`, with pending and rejected rows in place, and also checks that the script fails loudly when given a privileged key.

### Lighthouse

`pnpm lighthouse` (Lighthouse CI, config in `lighthouserc.cjs`) audits `/`, an entry page, `/search?q=`, `/speakers` and `/submit` three times each against the built site (`pnpm build` first, with the local stack running and the env from "Running the site locally"). Performance, accessibility and best practices must each be at least 0.95. SEO is not asserted: the site is deliberately `noindex`. Set `CHROME_PATH` to use an existing Chromium. The `Lighthouse` workflow runs it on every PR.

### Old Google Sites paths

`/home`, `/the-college-years` and `/dont-let-your-memes-be-dreams` (the site's only three pages) redirect permanently (308) in `next.config.ts`; `packages/e2e/tests/public/redirects.spec.ts` checks the status and `Location`.

### Keep-alive and backups

Two scheduled GitHub Actions workflows protect the free-tier hosted project. Each skips with a warning when its secret is missing (a manual run fails instead, so a missing secret is obvious).

GitHub disables scheduled workflows in a public repository after 60 days without repository activity, which would silently stop both. Watch for GitHub's "scheduled workflow disabled" email and re-enable them from the Actions tab; any push also resets the timer.

- **`keepalive.yml`** (every 3 days) reads one row from `entries` through the REST API, so the project is never idle long enough to pause. Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (the publishable or anon key only).
- **`backup.yml`** (daily) runs `pg_dump` of the `public` schema and uploads `aaronisms-data-<date>.sql.gz.gpg` (all rows) and `aaronisms-schema-<date>.sql.gz.gpg` (reference copy) as the `database-backup` artifact, kept for 30 days. Secrets: `SUPABASE_DB_URL`, the Postgres connection string from Project Settings, Database (use the Session pooler string: GitHub runners have no IPv6 and the direct host is IPv6 only), and `BACKUP_PASSPHRASE`, a long random passphrase kept somewhere other than GitHub. This repository is public and anyone signed in to GitHub can download its artifacts, so the dumps are encrypted with that passphrase, and the job skips without it. Images in Storage are not in the dump (the rows keep their paths); the originals are what the importer was given.

To restore (needs `psql` 17), the target must be a fresh Supabase project with the migrations applied (`supabase db push` from `packages/db`, or the GitHub integration) and no data: the import must not have been run there, or the load fails on duplicate keys. The search triggers rebuild each entry's search column during the load. Then load the data:

```sh
gpg --decrypt aaronisms-data-<date>.sql.gz.gpg | gunzip | psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 --single-transaction
```

## Changesets

Every PR includes a changeset describing what changed (CI checks this). Run `pnpm changeset`, pick the packages you touched and the bump type, and commit the generated file in `.changeset/`. When changes land on `main`, the Release workflow applies the pending changesets, bumping versions and writing each package's `CHANGELOG.md`, and commits that straight to `main`. All packages are private, so nothing is published to npm.

## Packages

| Package              | Path              | Purpose                                                        |
| -------------------- | ----------------- | -------------------------------------------------------------- |
| `@aaronisms/web`     | `apps/web`        | The Next.js site (App Router, Tailwind v4), deployed to Vercel |
| `@aaronisms/ui`      | `packages/ui`     | shadcn-style primitives, `cn()`, Tailwind theme tokens         |
| `@aaronisms/db`      | `packages/db`     | Supabase migrations, seed, generated types, Zod schemas        |
| `@aaronisms/email`   | `packages/email`  | React Email templates and `sendEmail()` (Resend or local SMTP) |
| `@aaronisms/config`  | `packages/config` | Shared ESLint, TypeScript and Prettier config                  |
| `@aaronisms/e2e`     | `packages/e2e`    | Playwright end-to-end tests                                    |
| `@aaronisms/scripts` | `scripts`         | One-off data jobs: Google Sites and Google Form import         |

Dependencies flow one way: `config <- ui <- web -> db`; `e2e` drives `web` through the browser.

## Where code goes

| If you are writing...                 | It goes in...                                            |
| ------------------------------------- | -------------------------------------------------------- |
| A page or URL                         | `apps/web/src/app/`, kept thin                           |
| Domain logic (entries, speakers, ...) | `apps/web/src/features/<name>/`                          |
| A database read or write              | `features/<name>/queries.ts` or `actions.ts`             |
| A schema change                       | `packages/db/supabase/migrations/`, then `pnpm db:types` |
| A shared data shape or validation     | `packages/db/src/schemas.ts`                             |
| A generic UI building block           | `packages/ui/src/components/`                            |
| Site chrome (header, footer)          | `apps/web/src/components/layout/`                        |
| A browser user-journey test           | `packages/e2e/tests/`                                    |
| A unit test                           | `apps/web/tests/` (or the package it tests)              |
| Lint, TypeScript or Prettier rules    | `packages/config/`                                       |
| A one-off data job                    | `scripts/`                                               |

## Database

Schema changes are SQL migrations in `packages/db/supabase/migrations/`. The local stack needs Docker.

```sh
cd packages/db
pnpm exec supabase start            # start the local stack
pnpm exec supabase db reset         # apply migrations + seed.sql (made-up sample entries)
pnpm db:types                       # regenerate src/database.types.ts after a schema change
pnpm test                           # all tests, including RLS and importer tests on the real database
```

`pnpm test` needs Docker running: the tests use the local Supabase stack (real Postgres), starting it if it is not already up and leaving it running afterwards. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to point at a different stack instead. `mise run setup` remains the one-time bootstrap.

Security model: anonymous visitors can only read published entries, their lines, speakers and published memes. Everything else (writes, `moderation_tokens`, pending or rejected entries) goes through the service role in server code. The private entry columns (`submitted_by`, `submitter_ip`, `reviewed_by_email`, `decision_note`) are not granted to the API roles at all, so select explicit columns instead of `select *` from the anon client. The bucket is public, so image URLs serve without a `storage.objects` policy; there is deliberately none, so anon cannot list objects.

## Importing the old Google Sites content

The importer lives in `scripts/` and needs `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`. Always start with a dry run, which parses everything and prints counts, speakers, a few sample entries and any images it cannot find, without touching the database:

```sh
# Save each page from Chrome with "Webpage, Complete", into one folder (here Downloads/aaronisms-export).
# Paths may start with ~ (also on Windows) and relative paths are relative to where you run the command.
pnpm --filter @aaronisms/scripts import:google-site --dir ~/Downloads/aaronisms-export --dry-run

# Optional: a Complete save does not keep the photos. Download them from the live site
# (needs a machine that can reach it; no install required), then pass the folder.
pnpm --filter @aaronisms/scripts fetch:images ~/Downloads/aaronisms-images

pnpm --filter @aaronisms/scripts import:google-site --dir ~/Downloads/aaronisms-export --images-dir ~/Downloads/aaronisms-images
```

The site caches published entries for up to an hour, and the importer writes straight to the database, so a fresh import can take that long to appear; to show it at once, purge the `entries` tag in Vercel (Project, Settings, Caches) or redeploy. Approvals and admin edits refresh the cache themselves.

Expect about 200 dated entries, about 15 to 16 College Years entries and 1 meme. Re-running skips entries whose slug already exists; add `--reset` to delete the imported entries and memes first and import again. Missing images are logged and do not stop the import. Explicit `--home`, `--college` and `--memes` file paths override `--dir`. Speaker spelling variants are merged by the alias map in `scripts/src/google-sites/plan.ts`.

Responses from the old Google Form (export the response Sheet as CSV) can be imported as pending entries; ones whose text is already on the site are skipped:

```sh
pnpm --filter @aaronisms/scripts import:form-responses --csv responses.csv --dry-run
pnpm --filter @aaronisms/scripts import:form-responses --csv responses.csv
```

Use `--timestamp-col`, `--who-col`, `--what-col` and `--name-col` if the sheet's column headings differ from the defaults.
