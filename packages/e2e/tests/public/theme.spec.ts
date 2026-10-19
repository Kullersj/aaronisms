import { expect, test } from '@playwright/test';
import { FeedPage } from '../../pages/FeedPage';

test('dark mode toggles and persists across reloads', async ({ page }) => {
  const feed = new FeedPage(page);
  await page.emulateMedia({ colorScheme: 'light' });
  await feed.goto();
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Toggle dark mode' }).click();
  await expect(html).toHaveClass(/dark/);

  await page.reload();
  await expect(html).toHaveClass(/dark/);
  await page.goto('/college');
  await expect(html).toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Toggle dark mode' }).click();
  await page.reload();
  await expect(html).not.toHaveClass(/dark/);
});

test('follows the system theme until a choice is saved', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await new FeedPage(page).goto();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
