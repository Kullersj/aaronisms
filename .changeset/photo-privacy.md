---
'@aaronisms/web': patch
'@aaronisms/db': patch
'@aaronisms/scripts': patch
'@aaronisms/e2e': patch
---

Submitted photos now go to a private bucket and are copied to the public one, under a random name, only when an entry is approved. Photos are re-encoded to strip EXIF metadata and capped in size, signed URLs are used in the moderation email and review pages, and removed, replaced or deleted entries no longer leave their photo public.
