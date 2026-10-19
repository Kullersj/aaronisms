import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig keeps JSX for Next to compile; Vitest needs it transformed.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      // The real package throws outside React Server Components.
      'server-only': new URL('./tests/stubs/server-only.ts', import.meta.url).pathname,
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    globalSetup: ['../../packages/db/testing/global-setup.ts'],
    setupFiles: ['tests/setup-env.ts'],
  },
});
