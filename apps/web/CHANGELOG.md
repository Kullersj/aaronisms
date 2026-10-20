# @aaronisms/web

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
