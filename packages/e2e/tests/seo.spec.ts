import { expect, test } from '@playwright/test';

test('home page is not indexable', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('legacy /home path redirects to /', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/$/);
});
