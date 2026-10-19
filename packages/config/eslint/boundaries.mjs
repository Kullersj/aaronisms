import boundaries from 'eslint-plugin-boundaries';

const plugins = { boundaries };
const resolver = { 'import/resolver': { typescript: { alwaysTryTypes: true } } };

/** `@aaronisms/ui` is generic: it must not know about the app or the database. */
export const uiBoundaries = [
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@aaronisms/web', '@aaronisms/web/*', '@aaronisms/db', '@aaronisms/db/*'],
              message: '@aaronisms/ui must not depend on the app or the database.',
            },
          ],
        },
      ],
    },
  },
];

/** Components render on the client, so they must never reach the service-role Supabase client. */
export const webBoundaries = [
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins,
    settings: {
      ...resolver,
      'boundaries/elements': [
        { type: 'component', pattern: ['src/components', 'src/features/*/components'] },
      ],
      'boundaries/files': [{ category: 'supabase-admin', pattern: 'src/lib/supabase/admin.ts' }],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'component' } },
              disallow: { to: { file: { categories: 'supabase-admin' } } },
            },
          ],
        },
      ],
    },
  },
];
