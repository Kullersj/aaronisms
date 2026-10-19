import { expect, test } from '@playwright/test';
import { SEED } from '../../fixtures/seed';
import { CollegePage } from '../../pages/CollegePage';
import { FeedPage } from '../../pages/FeedPage';
import { SiteHeader } from '../../pages/SiteHeader';

test('the College Years page lists the undated entries, not the dated ones', async ({ page }) => {
  await new FeedPage(page).goto();
  await new SiteHeader(page).link('College Years').click();
  const college = new CollegePage(page);
  await expect(college.heading).toBeVisible();
  await expect(college.entries).toHaveCount(1);
  await expect(college.entries.getByText(SEED.published.bicycle.text)).toBeVisible();
  await expect(page.getByText(SEED.published.sandwich.text)).toHaveCount(0);
});

test('a College Years card links to its own page', async ({ page }) => {
  await new FeedPage(page).goto();
  await new SiteHeader(page).link('College Years').click();
  const college = new CollegePage(page);
  await college.permalink.click();
  await expect(page).toHaveURL(new RegExp(`/a/${SEED.published.bicycle.slug}$`));
  await expect(page.getByText(SEED.published.bicycle.text)).toBeVisible();
});
