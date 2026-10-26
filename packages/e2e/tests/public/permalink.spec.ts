import { expect, test } from '@playwright/test';
import { SEED } from '../../fixtures/seed';
import { EntryPage } from '../../pages/EntryPage';
import { FeedPage } from '../../pages/FeedPage';

const { published, hidden } = SEED;

test('a card links to its permalink page, and back to the feed', async ({ page }) => {
  const feed = new FeedPage(page);
  await feed.goto();
  await feed.permalinkFor(published.lighthouse.date).click();
  await expect(page).toHaveURL(new RegExp(`/a/${published.lighthouse.slug}$`));
  const entry = new EntryPage(page);
  await expect(
    page.getByRole('heading', { level: 1, name: published.lighthouse.date }),
  ).toBeVisible();
  await expect(entry.article.getByText(published.lighthouse.text)).toBeVisible();
  await expect(page).toHaveTitle(`${published.lighthouse.date} | Aaronisms`);
  await entry.backLink.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(feed.allAaronisms).toBeAttached();
});

test('each entry that shares a date has its own permalink', async ({ page }) => {
  const feed = new FeedPage(page);
  await feed.goto();
  await feed.permalinkFor(published.pumpkin.date, 0).click();
  await expect(page).toHaveURL(new RegExp(`/a/${published.pumpkin.slug}$`));
  await expect(page.getByText(published.pumpkin.text)).toBeVisible();
  await page.goBack();
  await feed.permalinkFor(published.sandwich.date, 1).click();
  await expect(page).toHaveURL(new RegExp(`/a/${published.sandwich.slug}$`));
  await expect(page.getByText(published.sandwich.text)).toBeVisible();
  await expect(page.getByText(published.pumpkin.text)).toHaveCount(0);
});

test('Copy link puts the permalink on the clipboard and says so', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const entry = new EntryPage(page);
  await entry.goto(published.lighthouse.slug);
  await entry.copyLink.click();
  await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(new RegExp(`/a/${published.lighthouse.slug}$`));
});

test('a shared link to an unknown or unpublished entry says not found', async ({ page }) => {
  const entry = new EntryPage(page);
  for (const slug of ['does-not-exist', hidden.pending.slug, hidden.rejected.slug]) {
    const response = await entry.goto(slug);
    expect(response?.status()).toBe(404);
    await expect(entry.notFound).toBeVisible();
  }
});
