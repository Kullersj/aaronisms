import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    globalSetup: ['./testing/global-setup.ts'],
  },
});
