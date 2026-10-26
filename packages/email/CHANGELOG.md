# @aaronisms/email

## 0.2.1

### Patch Changes

- 5fb5d63: Dedupe the web form helpers, admin message codes, test helpers and shared dependencies, and remove dead code. The moderator email subject is now neutral (no submitter name), submitter text in it is stripped of control characters, and the rate limiter buckets IPv6 addresses by /64.

## 0.2.0

### Minor Changes

- f152a6e: Add the public submit form, email-link moderation with first-decision-wins, and a magic-link admin for the queue, entry edits and speaker merging.

## 0.1.0

### Minor Changes

- 9e535ca: Scaffold the monorepo: Next.js app, shared UI, database, email and config packages, and Playwright end-to-end tests.
