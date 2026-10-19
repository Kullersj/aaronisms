import { expect, test, type Page, type Response } from '@playwright/test';
import { SEED } from '../fixtures/seed';
import { OgImage } from '../pages/OgImage';

// Request-level on purpose: robots headers and meta tags are read by crawlers, not visitors, so
// there is nothing on screen to click or read. Each test asserts what a crawler would see.

const NOINDEX = /noindex/;

async function expectNoindex(page: Page, response: Response | null) {
  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-robots-tag']).toMatch(NOINDEX);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', NOINDEX);
}

const PAGES = [
  '/',
  '/college',
  '/memes',
  '/submit',
  '/search',
  '/search?q=pumpkin',
  '/speakers',
  `/speakers/${SEED.speakers.testAaron.slug}`,
  `/a/${SEED.published.sandwich.slug}`,
];

for (const path of PAGES) {
  test(`${path} is not indexable`, async ({ page }) => {
    await expectNoindex(page, await page.goto(path));
  });
}

test('moderation pages are not indexable and send no referrer', async ({ page }) => {
  const response = await page.goto(`/moderate/${'A'.repeat(43)}`);
  expect(response?.headers()['x-robots-tag']).toMatch(NOINDEX);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', NOINDEX);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
});

test('the random redirect is not indexable', async ({ request }) => {
  const response = await request.get('/random', { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.headers()['x-robots-tag']).toMatch(NOINDEX);
});

test('social cards are not indexable', async ({ page, request }) => {
  const og = new OgImage(page);
  for (const from of [`/a/${SEED.published.sandwich.slug}`, '/']) {
    const response = await request.get(await og.advertisedBy(from));
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag']).toBe(
      'noindex, nofollow, noarchive, nosnippet, noimageindex',
    );
  }
});

test('there is no sitemap', async ({ request }) => {
  expect((await request.get('/sitemap.xml')).status()).toBe(404);
});
