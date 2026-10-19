import { expect, test } from '@playwright/test';
import { OgImage } from '../pages/OgImage';

test('home page is not indexable', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('permalink page is not indexable', async ({ page }) => {
  const response = await page.goto('/a/2026-01-05-1');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('legacy /home path redirects to /', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/$/);
});

test('moderation pages are not indexable and send no referrer', async ({ page }) => {
  const response = await page.goto(`/moderate/${'A'.repeat(43)}`);
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
});

test('the submit page is not indexable', async ({ page }) => {
  const response = await page.goto('/submit');
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

for (const path of ['/search', '/search?q=pumpkin', '/speakers', '/speakers/test-aaron']) {
  test(`${path} is not indexable`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
}

test('the random redirect is not indexable', async ({ request }) => {
  const response = await request.get('/random', { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.headers()['x-robots-tag']).toContain('noindex');
});

test('OG images are not indexable', async ({ page, request }) => {
  const og = new OgImage(page);
  for (const from of ['/a/2026-01-05-1', '/']) {
    const response = await request.get(await og.advertisedBy(from));
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag']).toBe(
      'noindex, nofollow, noarchive, nosnippet, noimageindex',
    );
  }
});

test('there is still no sitemap', async ({ request }) => {
  expect((await request.get('/sitemap.xml')).status()).toBe(404);
});
