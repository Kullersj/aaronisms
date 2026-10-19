// Lighthouse CI: `pnpm lighthouse` audits the built site (start with `pnpm build`) against the
// local Supabase stack. SEO is not asserted: the site is deliberately noindex, which Lighthouse
// reports as a failing "page is blocked from indexing" audit.
const MIN = 0.95;
const category = ['error', { minScore: MIN }];

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/a/2026-01-05-1',
        'http://localhost:3000/search?q=pumpkin',
        'http://localhost:3000/speakers',
        'http://localhost:3000/submit',
      ],
      startServerCommand: 'pnpm --filter @aaronisms/web start',
      startServerReadyPattern: 'Ready',
      numberOfRuns: 3,
      settings: {
        // CI containers run as root, which Chrome refuses to sandbox.
        chromeFlags: '--no-sandbox --headless=new',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': category,
        'categories:accessibility': category,
        'categories:best-practices': category,
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
