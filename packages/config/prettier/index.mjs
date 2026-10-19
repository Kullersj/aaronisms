import { fileURLToPath } from 'node:url';

/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  // Resolved here so every package finds the plugin through @aaronisms/config.
  plugins: [fileURLToPath(import.meta.resolve('prettier-plugin-tailwindcss'))],
  tailwindFunctions: ['cn', 'cva'],
};
