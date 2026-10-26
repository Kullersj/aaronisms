# @aaronisms/e2e

## 0.4.9

### Patch Changes

- d4911c7: Make admin sign-in links work in any browser or device, so two moderators can sign in at the same time and a link opened on a phone or in a mail app works. The email now links to `/auth/confirm` with a token hash instead of a PKCE code that only the asking browser could use. The hosted Supabase project needs the new Magic Link email template (see `docs/launch.md`).

## 0.4.8

### Patch Changes

- e952420: Speaker points: speakers earn 10 points per published Aaronism they are in, 1 per line they say, and 25 per published Aaronism they submitted under their own name. The Speakers page ranks them by points (with an A to Z toggle), and each speaker page shows their points, rank and who they need to pass next. Admins can correct an entry's submitter on its edit page.

## 0.4.7

### Patch Changes

- fd735d1: Submitted photos now go to a private bucket and are copied to the public one, under a random name, only when an entry is approved. Photos are re-encoded to strip EXIF metadata and capped in size, signed URLs are used in the moderation email and review pages, and removed, replaced or deleted entries no longer leave their photo public.
- 2041c85: The database tests and the destructive e2e journeys now refuse to run against a non-local Supabase URL unless `ALLOW_REMOTE_SUPABASE_TESTS=1` is set. Turbo's build cache now sees `.env*` files and typecheck/lint depend on their workspace dependencies, web typecheck uses `next typegen`, and the env and share-image docs match the code.
- 5fb5d63: Dedupe the web form helpers, admin message codes, test helpers and shared dependencies, and remove dead code. The moderator email subject is now neutral (no submitter name), submitter text in it is stripped of control characters, and the rate limiter buckets IPv6 addresses by /64.

## 0.4.6

### Patch Changes

- 756ddf6: List the newest posts first, including among entries that share a date

## 0.4.5

### Patch Changes

- 0dc5d02: Make deleting an entry a soft delete: it leaves the site but keeps its lines and photo, shows as Deleted in the admin Entries list, and can be restored by setting its status again. Replaced or removed photos also stay in storage.

## 0.4.4

### Patch Changes

- 7c3b060: Let every address in `MODERATOR_EMAILS` sign in to `/admin`, not only the first. The first address stays the default moderator: the `Reply-To` on moderation emails and the recipient of failure alerts.

## 0.4.3

### Patch Changes

- fef778a: Let the admin delete an entry for good from its edit page, after a confirmation, and find any entry from a new Entries list in the admin.

## 0.4.2

### Patch Changes

- 2d4620e: Rewrite the end-to-end suite around what visitors, moderators and the admin actually do: navigate by clicking and typing, find elements by their accessible names and labels, assert what is on screen, and read moderation links from the emails. Database access is kept for setup and for effects with no screen. Add navigation, keyboard-only search, dark mode persistence, form validation and emailed-decision checks.

## 0.4.1

### Patch Changes

- 9b15b58: Fix the Random button so every press picks a new entry. It was a client-side link, so the browser replayed the first redirect instead of asking the server again; it is now a plain link, and the server never sends you back to the entry you are already on.

## 0.4.0

### Minor Changes

- 38a4926: Add launch prep: `pnpm check:rls` (anon-role Row Level Security checks that are safe to run against the hosted project), old-path redirect tests, a Lighthouse CI workflow (95+ for performance, accessibility and best practices), a banana site icon (favicon and Apple touch icon), scheduled Supabase keep-alive and database backup workflows, and a launch checklist.

## 0.3.0

### Minor Changes

- 79ca173: Add full-text search with speaker filters and a header search box, speaker pages and index, a random-entry redirect, a pinned year jump on phones, and `next/og` share images for entries and the site.

## 0.2.0

### Minor Changes

- f152a6e: Add the public submit form, email-link moderation with first-decision-wins, and a magic-link admin for the queue, entry edits and speaker merging.

## 0.1.0

### Minor Changes

- Build the public site: year-grouped feed, entry permalinks, College Years, memes lightbox and dark mode.
- 9e535ca: Scaffold the monorepo: Next.js app, shared UI, database, email and config packages, and Playwright end-to-end tests.
