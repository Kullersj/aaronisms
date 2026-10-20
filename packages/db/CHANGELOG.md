# @aaronisms/db

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
