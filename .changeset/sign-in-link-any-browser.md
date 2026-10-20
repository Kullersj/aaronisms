---
'@aaronisms/web': patch
'@aaronisms/db': patch
'@aaronisms/e2e': patch
---

Make admin sign-in links work in any browser or device, so two moderators can sign in at the same time and a link opened on a phone or in a mail app works. The email now links to `/auth/confirm` with a token hash instead of a PKCE code that only the asking browser could use. The hosted Supabase project needs the new Magic Link email template (see `docs/launch.md`).
