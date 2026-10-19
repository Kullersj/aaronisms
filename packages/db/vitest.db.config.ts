import { defineConfig } from 'vitest/config';

// Integration tests against a running local Supabase stack (see README).
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
});
