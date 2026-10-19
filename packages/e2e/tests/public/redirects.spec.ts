import { expect, test } from '@playwright/test';
import { CollegePage } from '../../pages/CollegePage';
import { FeedPage } from '../../pages/FeedPage';
import { MemesPage } from '../../pages/MemesPage';

// The three pages of the old Google Sites site (the same list as scripts/fetch-google-site-images.mjs).
const OLD_PATHS = [
  ['/home', '/'],
  ['/the-college-years', '/college'],
  ['/dont-let-your-memes-be-dreams', '/memes'],
] as const;

for (const [from, to] of OLD_PATHS) {
  // Request-level: search engines and old bookmarks need the permanent status, which a
  // browser hides.
  test(`${from} permanently redirects to ${to}`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(new URL(response.headers()['location']!, 'http://localhost').pathname).toBe(to);
  });
}

test('an old bookmark to each page of the old site lands on its new page', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/$/);
  await expect(new FeedPage(page).allAaronisms).toBeAttached();

  await page.goto('/the-college-years');
  await expect(page).toHaveURL(/\/college$/);
  await expect(new CollegePage(page).heading).toBeVisible();

  await page.goto('/dont-let-your-memes-be-dreams');
  await expect(page).toHaveURL(/\/memes$/);
  await expect(new MemesPage(page).heading).toBeVisible();
});
