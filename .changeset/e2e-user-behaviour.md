---
'@aaronisms/e2e': patch
---

Rewrite the end-to-end suite around what visitors, moderators and the admin actually do: navigate by clicking and typing, find elements by their accessible names and labels, assert what is on screen, and read moderation links from the emails. Database access is kept for setup and for effects with no screen. Add navigation, keyboard-only search, dark mode persistence, form validation and emailed-decision checks.
