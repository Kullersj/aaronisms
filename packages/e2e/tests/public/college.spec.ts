import { expect, test } from '@playwright/test';
import { CollegePage } from '../../pages/CollegePage';

test('college page lists undated entries as cards', async ({ page }) => {
  const college = new CollegePage(page);
  await college.goto();
  await expect(college.heading).toBeVisible();
  await expect(college.entries).toHaveCount(1);
  await expect(college.entries.first().getByText('A bicycle is just a horse')).toBeVisible();
  await expect(page.getByText('I would never eat a sandwich')).toHaveCount(0);
});

test('a college card links to its permalink', async ({ page }) => {
  const college = new CollegePage(page);
  await college.goto();
  await page.getByRole('link', { name: 'Permalink to this entry' }).click();
  await expect(page).toHaveURL(/\/a\/college-1$/);
  await expect(page.getByText('A bicycle is just a horse')).toBeVisible();
});

test('legacy college path redirects', async ({ page }) => {
  await page.goto('/the-college-years');
  await expect(page).toHaveURL(/\/college$/);
});
