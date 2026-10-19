---
'@aaronisms/scripts': patch
---

The importers expand a leading `~` in path arguments (Windows shells don't), resolve relative paths against the folder the command was run from, and accept a `SUPABASE_URL` copied with `/rest/v1` or a trailing slash (anything else that isn't a project URL now fails with a clear error). New `fetch:images` script.
