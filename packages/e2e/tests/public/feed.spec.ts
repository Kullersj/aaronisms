import { expect, test } from '@playwright/test';
import { SEED } from '../../fixtures/seed';
import { FeedPage } from '../../pages/FeedPage';
import { SiteHeader } from '../../pages/SiteHeader';
import { expectNoHorizontalScroll } from '../../fixtures/browser';

const { published, hidden } = SEED;

test.describe('feed', () => {
  test('shows published entries and hides pending, rejected and College Years ones', async ({
    page,
  }) => {
    const feed = new FeedPage(page);
    await feed.goto();
    await expect(page.getByText(published.sandwich.text)).toBeVisible();
    await expect(page.getByText(published.lighthouse.text)).toBeVisible();
    await expect(page.getByText(hidden.pending.text)).toHaveCount(0);
    await expect(page.getByText(hidden.rejected.text)).toHaveCount(0);
    await expect(page.getByText(published.bicycle.text)).toHaveCount(0);
  });

  test('lists newest dates first and shows both entries that share a date', async ({ page }) => {
    const feed = new FeedPage(page);
    await feed.goto();
    await expect(feed.entryOn(published.sandwich.date)).toHaveCount(2);
    await expect(feed.dateHeadings).toHaveText([
      published.lighthouse.date,
      published.sandwich.date,
      published.pumpkin.date,
    ]);
  });

  test('shows speakers in bold, their words in italics and stage directions in brackets', async ({
    page,
  }) => {
    const feed = new FeedPage(page);
    await feed.goto();
    const entry = feed.entries.filter({ hasText: published.pumpkin.text });
    await expect(entry.getByText('Test Aaron:')).toHaveCSS('font-weight', /^(600|700)$/);
    await expect(entry.getByText(published.pumpkin.reply)).toHaveCSS('font-style', 'italic');
    await expect(entry.getByText(`[${published.pumpkin.stage}]`)).toBeVisible();
    await expect(entry.getByText(published.pumpkin.group)).toBeVisible();
    await expect(entry.getByText(published.pumpkin.setup)).toBeVisible();
  });

  test('groups entries under their year', async ({ page }) => {
    const feed = new FeedPage(page);
    await feed.goto();
    await expect(feed.yearHeadings).toHaveText(['2026']);
    await expect(feed.entries.first()).toBeVisible();
  });

  test('marks the current page in the nav as the visitor moves around', async ({ page }) => {
    const feed = new FeedPage(page);
    const header = new SiteHeader(page);
    await feed.goto();
    await expect(header.link('Home')).toHaveAttribute('aria-current', 'page');
    await header.link('College Years').click();
    await expect(page).toHaveURL(/\/college$/);
    await expect(header.link('College Years')).toHaveAttribute('aria-current', 'page');
    await expect(header.link('Home')).not.toHaveAttribute('aria-current');
  });

  test('has no horizontal scroll at a phone width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const feed = new FeedPage(page);
    await feed.goto();
    await expect(feed.entries.first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
