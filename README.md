# Aaronisms

A collection of things said. A Next.js monorepo (pnpm workspaces + Turborepo) backed by Supabase. See the migration plan for the full design; this repo is at Phase 0 (setup only).

## Setup

Tool versions (Node, pnpm, Supabase CLI) are pinned in `mise.toml`.

```sh
mise install        # installs the pinned tools
mise run setup      # pnpm install, start local Supabase, generate DB types
```

Without mise, use Node >= 22 and pnpm 10.28 (`corepack enable`), then `pnpm install`. Copy `.env.example` to `.env.local` and fill in the values.

```sh
pnpm dev            # run the site at http://localhost:3000
pnpm build          # production build
pnpm lint && pnpm typecheck && pnpm test
pnpm e2e            # Playwright against the built app (builds web first)
pnpm format         # prettier
```

For `pnpm e2e` on a fresh machine, install a browser once with `pnpm --filter @aaronisms/e2e exec playwright install chromium`. Set `BASE_URL` to test an already-running deployment, or `PW_CHROMIUM_PATH` to use an existing Chromium binary.

## Changesets

Every PR includes a changeset describing what changed (CI checks this). Run `pnpm changeset`, pick the packages you touched and the bump type, and commit the generated file in `.changeset/`. When changes land on `main`, the Release workflow applies the pending changesets, bumping versions and writing each package's `CHANGELOG.md`, and commits that straight to `main`. All packages are private, so nothing is published to npm.

## Packages

| Package             | Path              | Purpose                                                        |
| ------------------- | ----------------- | -------------------------------------------------------------- |
| `@aaronisms/web`    | `apps/web`        | The Next.js site (App Router, Tailwind v4), deployed to Vercel |
| `@aaronisms/ui`     | `packages/ui`     | shadcn-style primitives, `cn()`, Tailwind theme tokens         |
| `@aaronisms/db`     | `packages/db`     | Supabase migrations, seed, generated types, Zod schemas        |
| `@aaronisms/email`  | `packages/email`  | Email templates (placeholder until Phase 3)                    |
| `@aaronisms/config` | `packages/config` | Shared ESLint, TypeScript and Prettier config                  |
| `@aaronisms/e2e`    | `packages/e2e`    | Playwright end-to-end tests                                    |

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
