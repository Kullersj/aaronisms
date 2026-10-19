import { expect, test } from '@playwright/test';
import { FeedPage } from '../../pages/FeedPage';

test.describe('feed', () => {
  test('shows published seed entries and hides pending or rejected ones', async ({ page }) => {
    const feed = new FeedPage(page);
    await feed.goto();
    await expect(
      page.getByText('I would never eat a sandwich that has been to a party.'),
    ).toBeVisible();
    await expect(page.getByText('The lighthouse is closed on Tuesdays')).toBeVisible();
    await expect(page.getByText('Pending quote about a very patient toaster.')).toHaveCount(0);
    await expect(page.getByText('Rejected quote about an unremarkable spoon.')).toHaveCount(0);
    await expect(page.getByText('A bicycle is just a horse')).toHaveCount(0);
  });

  test('shows both entries that share a date, newest date first', async ({ page }) => {
    const feed = new FeedPage(page);
    await feed.goto();
    await expect(feed.entryOn('January 5, 2026')).toHaveCount(2);
    const dates = await page.getByRole('heading', { level: 3 }).allTextContents();
    expect(dates).toEqual(['February 14, 2026', 'January 5, 2026', 'January 5, 2026']);
  });

  test('renders speakers bold, lines italic and stage directions in brackets', async ({ page }) => {
    const feed = new FeedPage(page);
    await feed.goto();
    const second = feed.entryOn('January 5, 2026').nth(1);
    await expect(second.locator('strong', { hasText: 'Test Aaron:' })).toBeVisible();
    await expect(second.locator('em', { hasText: 'It is mostly a gourd, Test.' })).toBeVisible();
    await expect(second.getByText('[Everyone nods slowly.]')).toBeVisible();
    await expect(second.getByText('Everyone else (in unison):')).toBeVisible();
    await expect(second.getByText('Looking at a very large pumpkin:')).toBeVisible();
  });

  test('groups entries under year headings with a year jump list', async ({ page }) => {
    const feed = new FeedPage(page);
    await feed.goto();
    await expect(feed.yearHeadings).toHaveText(['2026']);
    await expect(page.getByRole('heading', { level: 1, name: 'All Aaronisms' })).toBeAttached();
  });

  test('marks the current page in the nav', async ({ page }) => {
    const feed = new FeedPage(page);
    await feed.goto();
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'College Years' }).click();
    await expect(page).toHaveURL(/\/college$/);
    await expect(nav.getByRole('link', { name: 'College Years' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  test('has no horizontal scroll at a phone width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const feed = new FeedPage(page);
    await feed.goto();
    await expect(feed.entries.first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
