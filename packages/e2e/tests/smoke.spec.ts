import { expect, test } from '@playwright/test';
import { FeedPage } from '../pages/FeedPage';

test('home page loads', async ({ page }) => {
  const feed = new FeedPage(page);
  await feed.goto();
  await expect(feed.heading).toBeVisible();
});
