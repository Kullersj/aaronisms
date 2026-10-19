import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export const base = defineConfig(
  globalIgnores([
    '**/database.types.ts',
    '**/.next/**',
    '**/dist/**',
    '**/node_modules/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/next-env.d.ts',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
