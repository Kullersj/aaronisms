---
'@aaronisms/web': minor
'@aaronisms/db': minor
'@aaronisms/e2e': patch
'@aaronisms/scripts': patch
---

Make deleting an entry a soft delete: it leaves the site but keeps its lines and photo, shows as Deleted in the admin Entries list, and can be restored by setting its status again. Replaced or removed photos also stay in storage.
