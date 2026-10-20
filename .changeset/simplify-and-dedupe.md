---
'@aaronisms/web': patch
'@aaronisms/email': patch
'@aaronisms/db': patch
'@aaronisms/ui': patch
'@aaronisms/e2e': patch
'@aaronisms/config': patch
---

Dedupe the web form helpers, admin message codes, test helpers and shared dependencies, and remove dead code. The moderator email subject is now neutral (no submitter name), submitter text in it is stripped of control characters, and the rate limiter buckets IPv6 addresses by /64.
