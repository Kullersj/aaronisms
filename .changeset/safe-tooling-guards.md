---
'@aaronisms/db': patch
'@aaronisms/e2e': patch
'@aaronisms/web': patch
---

The database tests and the destructive e2e journeys now refuse to run against a non-local Supabase URL unless `ALLOW_REMOTE_SUPABASE_TESTS=1` is set. Turbo's build cache now sees `.env*` files and typecheck/lint depend on their workspace dependencies, web typecheck uses `next typegen`, and the env and share-image docs match the code.
