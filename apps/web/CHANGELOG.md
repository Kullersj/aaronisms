# @aaronisms/web

## 0.8.0

### Minor Changes

- e952420: Speaker points: speakers earn 10 points per published Aaronism they are in, 1 per line they say, and 25 per published Aaronism they submitted under their own name. The Speakers page ranks them by points (with an A to Z toggle), and each speaker page shows their points, rank and who they need to pass next. Admins can correct an entry's submitter on its edit page.

### Patch Changes

- 5935d79: Two submissions adding the same new speaker at the same moment no longer fail one of them with a duplicate-name error.
- Updated dependencies [e952420]
  - @aaronisms/db@0.5.0
  - @aaronisms/email@0.2.1

## 0.7.3

### Patch Changes

- 9e6a000: Admin edits no longer unpublish an entry someone else just decided, keep imported group labels, speakerless lines, setup lines and long text intact, and report errors. Moderators and admins are told when their decision did not apply, and the admin form no longer re-uploads the same photo on every save.
- 480b31a: Harden the CI workflows: pin actions to commit SHAs, read-only tokens, a safer release push, and backups that leave out rate-limit and moderation-token data.
- fd735d1: Submitted photos now go to a private bucket and are copied to the public one, under a random name, only when an entry is approved. Photos are re-encoded to strip EXIF metadata and capped in size, signed URLs are used in the moderation email and review pages, and removed, replaced or deleted entries no longer leave their photo public.
- 2041c85: The database tests and the destructive e2e journeys now refuse to run against a non-local Supabase URL unless `ALLOW_REMOTE_SUPABASE_TESTS=1` is set. Turbo's build cache now sees `.env*` files and typecheck/lint depend on their workspace dependencies, web typecheck uses `next typegen`, and the env and share-image docs match the code.
- 5fb5d63: Dedupe the web form helpers, admin message codes, test helpers and shared dependencies, and remove dead code. The moderator email subject is now neutral (no submitter name), submitter text in it is stripped of control characters, and the rate limiter buckets IPv6 addresses by /64.
- Updated dependencies [9e6a000]
- Updated dependencies [fd735d1]
- Updated dependencies [2041c85]
- Updated dependencies [5fb5d63]
  - @aaronisms/db@0.4.2
  - @aaronisms/email@0.2.1
  - @aaronisms/ui@0.2.1

## 0.7.2

### Patch Changes

- 756ddf6: List the newest posts first, including among entries that share a date
- Updated dependencies [756ddf6]
  - @aaronisms/db@0.4.1

## 0.7.1

### Patch Changes

- 70d1ed2: Add analytics and speed insights

## 0.7.0

### Minor Changes

- 0dc5d02: Make deleting an entry a soft delete: it leaves the site but keeps its lines and photo, shows as Deleted in the admin Entries list, and can be restored by setting its status again. Replaced or removed photos also stay in storage.

### Patch Changes

- Updated dependencies [0dc5d02]
  - @aaronisms/db@0.4.0

## 0.6.0

### Minor Changes

- 7c3b060: Let every address in `MODERATOR_EMAILS` sign in to `/admin`, not only the first. The first address stays the default moderator: the `Reply-To` on moderation emails and the recipient of failure alerts.

### Patch Changes

- 119c1c7: Random never sends you back to the entry you are on, even while entries are being published or unpublished at the same moment.

## 0.5.1

### Patch Changes

- 47f0665: Tell the admin when Supabase's sign-in email limit is reached, instead of a generic "could not send" message.

## 0.5.0

### Minor Changes

- fef778a: Let the admin delete an entry for good from its edit page, after a confirmation, and find any entry from a new Entries list in the admin.

### Patch Changes

- Updated dependencies [fef778a]
  - @aaronisms/db@0.3.0

## 0.4.1

### Patch Changes

- cd75844: After "Save and approve" in the admin editor, the status select now shows Published, so a later Save no longer takes the entry back to pending.

## 0.4.0

### Minor Changes

- 27f0e57: Submit an Aaronism in a dialog over the current page, keeping /submit as a full page for direct visits.

## 0.3.3

### Patch Changes

- 9b15b58: Fix the Random button so every press picks a new entry. It was a client-side link, so the browser replayed the first redirect instead of asking the server again; it is now a plain link, and the server never sends you back to the entry you are already on.

## 0.3.2

### Patch Changes

- 63b4e68: Change the favicon and Apple touch icon to the open banana from Microsoft Fluent Emoji.

## 0.3.1

### Patch Changes

- 38a4926: Add launch prep: `pnpm check:rls` (anon-role Row Level Security checks that are safe to run against the hosted project), old-path redirect tests, a Lighthouse CI workflow (95+ for performance, accessibility and best practices), a banana site icon (favicon and Apple touch icon), scheduled Supabase keep-alive and database backup workflows, and a launch checklist.

## 0.3.0

### Minor Changes

- 79ca173: Add full-text search with speaker filters and a header search box, speaker pages and index, a random-entry redirect, a pinned year jump on phones, and `next/og` share images for entries and the site.

## 0.2.0

### Minor Changes

- f152a6e: Add the public submit form, email-link moderation with first-decision-wins, and a magic-link admin for the queue, entry edits and speaker merging.

### Patch Changes

- Updated dependencies [f152a6e]
  - @aaronisms/db@0.2.0
  - @aaronisms/email@0.2.0
  - @aaronisms/ui@0.2.0

## 0.1.0

### Minor Changes

- Build the public site: year-grouped feed, entry permalinks, College Years, memes lightbox and dark mode.
- 9e535ca: Scaffold the monorepo: Next.js app, shared UI, database, email and config packages, and Playwright end-to-end tests.

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies [9e535ca]
  - @aaronisms/db@0.1.0
  - @aaronisms/ui@0.1.0
