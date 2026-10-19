# @aaronisms/scripts

## 0.2.1

### Patch Changes

- fef778a: Let the admin delete an entry for good from its edit page, after a confirmation, and find any entry from a new Entries list in the admin.
- Updated dependencies [fef778a]
  - @aaronisms/db@0.3.0

## 0.2.0

### Minor Changes

- 38a4926: Add launch prep: `pnpm check:rls` (anon-role Row Level Security checks that are safe to run against the hosted project), old-path redirect tests, a Lighthouse CI workflow (95+ for performance, accessibility and best practices), a banana site icon (favicon and Apple touch icon), scheduled Supabase keep-alive and database backup workflows, and a launch checklist.

## 0.1.2

### Patch Changes

- 49a3649: The importers expand a leading `~` in path arguments (Windows shells don't), resolve relative paths against the folder the command was run from, and accept a `SUPABASE_URL` copied with `/rest/v1` or a trailing slash (anything else that isn't a project URL now fails with a clear error). New `fetch:images` script.

## 0.1.1

### Patch Changes

- Updated dependencies [f152a6e]
  - @aaronisms/db@0.2.0

## 0.1.0

### Minor Changes

- Add the Supabase schema, row-level security, search and storage bucket, plus the Google Sites and Google Form importers.

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies [9e535ca]
  - @aaronisms/db@0.1.0
