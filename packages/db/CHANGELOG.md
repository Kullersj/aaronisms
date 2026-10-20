# @aaronisms/db

## 0.4.2

### Patch Changes

- 9e6a000: Admin edits no longer unpublish an entry someone else just decided, keep imported group labels, speakerless lines, setup lines and long text intact, and report errors. Moderators and admins are told when their decision did not apply, and the admin form no longer re-uploads the same photo on every save.
- fd735d1: Submitted photos now go to a private bucket and are copied to the public one, under a random name, only when an entry is approved. Photos are re-encoded to strip EXIF metadata and capped in size, signed URLs are used in the moderation email and review pages, and removed, replaced or deleted entries no longer leave their photo public.
- 2041c85: The database tests and the destructive e2e journeys now refuse to run against a non-local Supabase URL unless `ALLOW_REMOTE_SUPABASE_TESTS=1` is set. Turbo's build cache now sees `.env*` files and typecheck/lint depend on their workspace dependencies, web typecheck uses `next typegen`, and the env and share-image docs match the code.
- 5fb5d63: Dedupe the web form helpers, admin message codes, test helpers and shared dependencies, and remove dead code. The moderator email subject is now neutral (no submitter name), submitter text in it is stripped of control characters, and the rate limiter buckets IPv6 addresses by /64.

## 0.4.1

### Patch Changes

- 756ddf6: List the newest posts first, including among entries that share a date

## 0.4.0

### Minor Changes

- 0dc5d02: Make deleting an entry a soft delete: it leaves the site but keeps its lines and photo, shows as Deleted in the admin Entries list, and can be restored by setting its status again. Replaced or removed photos also stay in storage.

## 0.3.0

### Minor Changes

- fef778a: Let the admin delete an entry for good from its edit page, after a confirmation, and find any entry from a new Entries list in the admin.

## 0.2.0

### Minor Changes

- f152a6e: Add the public submit form, email-link moderation with first-decision-wins, and a magic-link admin for the queue, entry edits and speaker merging.

## 0.1.0

### Minor Changes

- Add the Supabase schema, row-level security, search and storage bucket, plus the Google Sites and Google Form importers.
- 9e535ca: Scaffold the monorepo: Next.js app, shared UI, database, email and config packages, and Playwright end-to-end tests.

### Patch Changes

- Build the public site: year-grouped feed, entry permalinks, College Years, memes lightbox and dark mode.
