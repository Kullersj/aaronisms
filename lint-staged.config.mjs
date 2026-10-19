// ESLint configs live in each package, so lint through Turbo rather than per file.
export default {
  '*.{ts,tsx,mjs,js}': ['prettier --write', () => 'pnpm turbo run lint'],
  '*.{json,md,css,yml,yaml}': 'prettier --write',
};
