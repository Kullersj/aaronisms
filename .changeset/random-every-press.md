---
'@aaronisms/web': patch
'@aaronisms/e2e': patch
---

Fix the Random button so every press picks a new entry. It was a client-side link, so the browser replayed the first redirect instead of asking the server again; it is now a plain link, and the server never sends you back to the entry you are already on.
