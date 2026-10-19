import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Tests send real email to the local stack's Mailpit.
  test: { globalSetup: ['../db/testing/global-setup.ts'] },
});
