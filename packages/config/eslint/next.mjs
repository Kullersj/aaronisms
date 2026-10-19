import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import { base } from './base.mjs';

export const next = defineConfig(
  base,
  reactHooks.configs.flat['recommended-latest'],
  nextPlugin.configs['core-web-vitals'],
);
