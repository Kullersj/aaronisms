# @aaronisms/e2e

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
