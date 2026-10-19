# Aaronisms

A collection of things said. A Next.js monorepo (pnpm workspaces + Turborepo) backed by Supabase. See the migration plan for the full design; this repo is at Phase 2 (public UI).

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

<<<<<<< HEAD

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

`pnpm e2e` needs the same two variables in the environment, plus the local stack running. Image hosts for `next/image` are derived from `NEXT_PUBLIC_SUPABASE_URL` at build time, so rebuild after changing it. Data is cached under the `entries` and `memes` tags; later phases call `revalidateTag` to refresh it.
=======

## Changesets

Every PR includes a changeset describing what changed (CI checks this). Run `pnpm changeset`, pick the packages you touched and the bump type, and commit the generated file in `.changeset/`. When changes land on `main`, the Release workflow opens a "Version packages" PR that bumps versions and writes each package's `CHANGELOG.md`. All packages are private, so nothing is published to npm.

> > > > > > > claude/phase-1-schema-import

## Packages

| Package              | Path              | Purpose                                                        |
| -------------------- | ----------------- | -------------------------------------------------------------- |
| `@aaronisms/web`     | `apps/web`        | The Next.js site (App Router, Tailwind v4), deployed to Vercel |
| `@aaronisms/ui`      | `packages/ui`     | shadcn-style primitives, `cn()`, Tailwind theme tokens         |
| `@aaronisms/db`      | `packages/db`     | Supabase migrations, seed, generated types, Zod schemas        |
| `@aaronisms/email`   | `packages/email`  | Email templates (placeholder until Phase 3)                    |
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
pnpm test                           # unit tests (no database needed)
pnpm test:db                        # RLS tests against the local stack (see below)
```

`test:db` reads `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`; without them it is skipped. Take the values from `pnpm exec supabase status -o env` (`API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`).

Security model: anonymous visitors can only read published entries, their lines, speakers and published memes. Everything else (writes, `moderation_tokens`, pending or rejected entries) goes through the service role in server code. The private entry columns (`submitter_ip`, `reviewed_by_email`, `decision_note`) are not granted to the API roles at all, so select explicit columns instead of `select *` from the anon client.

## Importing the old Google Sites content

The importer lives in `scripts/` and needs `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`. Always start with a dry run, which parses everything and prints counts, speakers, a few sample entries and any images it cannot find, without touching the database:

```sh
# Save each page from Chrome with "Webpage, Complete", into one folder.
pnpm --filter @aaronisms/scripts import:google-site --dir ~/aaronisms-export --dry-run

# Optional: a Complete save does not keep the photos. Download them from the live site
# (needs a machine that can reach it; no install required), then pass the folder.
node scripts/fetch-google-site-images.mjs ~/aaronisms-images

pnpm --filter @aaronisms/scripts import:google-site --dir ~/aaronisms-export --images-dir ~/aaronisms-images
```

Expect about 200 dated entries, about 15 to 16 College Years entries and 1 meme. Re-running skips entries whose slug already exists; add `--reset` to delete the imported entries and memes first and import again. Missing images are logged and do not stop the import. Explicit `--home`, `--college` and `--memes` file paths override `--dir`. Speaker spelling variants are merged by the alias map in `scripts/src/google-sites/plan.ts`.

Responses from the old Google Form (export the response Sheet as CSV) can be imported as pending entries; ones whose text is already on the site are skipped:

```sh
pnpm --filter @aaronisms/scripts import:form-responses --csv responses.csv --dry-run
pnpm --filter @aaronisms/scripts import:form-responses --csv responses.csv
```

Use `--timestamp-col`, `--who-col`, `--what-col` and `--name-col` if the sheet's column headings differ from the defaults.
