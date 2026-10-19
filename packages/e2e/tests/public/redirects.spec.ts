import { expect, test } from '@playwright/test';

// The three pages of the old Google Sites site (the same list as scripts/fetch-google-site-images.mjs).
const OLD_PATHS = [
  ['/home', '/'],
  ['/the-college-years', '/college'],
  ['/dont-let-your-memes-be-dreams', '/memes'],
] as const;

for (const [from, to] of OLD_PATHS) {
  test(`${from} permanently redirects to ${to}`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(new URL(response.headers()['location']!, 'http://localhost').pathname).toBe(to);
  });

  test(`${from} lands on a working page`, async ({ request }) => {
    const response = await request.get(from);
    expect(response.status()).toBe(200);
    expect(new URL(response.url()).pathname).toBe(to);
  });
}
