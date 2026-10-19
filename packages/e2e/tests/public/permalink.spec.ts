import { expect, test } from '@playwright/test';
import { EntryPage } from '../../pages/EntryPage';
import { FeedPage } from '../../pages/FeedPage';

test('a card links to its permalink page', async ({ page }) => {
  const feed = new FeedPage(page);
  await feed.goto();
  await feed.permalinkFor('February 14, 2026').click();
  await expect(page).toHaveURL(/\/a\/2026-02-14-1$/);
  const entry = new EntryPage(page);
  await expect(page.getByRole('heading', { level: 1, name: 'February 14, 2026' })).toBeVisible();
  await expect(entry.article.getByText('The lighthouse is closed on Tuesdays')).toBeVisible();
  await expect(page).toHaveTitle('February 14, 2026 | Aaronisms');
  await entry.backLink.click();
  await expect(page).toHaveURL(/\/$/);
});

test('each entry on a shared date has its own permalink', async ({ page }) => {
  const entry = new EntryPage(page);
  await entry.goto('2026-01-05-1');
  await expect(page.getByText('I would never eat a sandwich')).toBeVisible();
  await entry.goto('2026-01-05-2');
  await expect(page.getByText('That is just a regular pumpkin')).toBeVisible();
});

test('copy link puts the permalink on the clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const entry = new EntryPage(page);
  await entry.goto('2026-02-14-1');
  await entry.copyLink.click();
  await expect(page.getByRole('status')).toHaveText('Link copied');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/\/a\/2026-02-14-1$/);
});

test('an unknown or unpublished slug is a 404', async ({ page }) => {
  const entry = new EntryPage(page);
  for (const slug of ['does-not-exist', '2026-03-01-1', '2026-03-02-1']) {
    const response = await entry.goto(slug);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Not found' })).toBeVisible();
  }
});
