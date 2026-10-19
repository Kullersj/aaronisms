import { expect, test, type Page } from '@playwright/test';
import { FeedPage } from '../../pages/FeedPage';
import { SiteHeader } from '../../pages/SiteHeader';

// What a visitor perceives of dark mode is the page colour, not any class name.
const background = (page: Page) => page.locator('body');
const readBackground = (page: Page) =>
  background(page).evaluate((body) => getComputedStyle(body).backgroundColor);

test('the dark mode button switches the page colours and the choice sticks as the visitor browses', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  const feed = new FeedPage(page);
  const header = new SiteHeader(page);
  await feed.goto();
  const light = await readBackground(page);

  await header.themeToggle.click();
  await expect(background(page)).not.toHaveCSS('background-color', light);
  const dark = await readBackground(page);

  await header.link('College Years').click();
  await expect(page).toHaveURL(/\/college$/);
  await expect(background(page)).toHaveCSS('background-color', dark);
  await page.reload();
  await expect(background(page)).toHaveCSS('background-color', dark);

  await header.themeToggle.click();
  await expect(background(page)).toHaveCSS('background-color', light);
  await header.link('Home').click();
  await expect(background(page)).toHaveCSS('background-color', light);
});

test('follows the system theme until the visitor chooses', async ({ page }) => {
  const feed = new FeedPage(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await feed.goto();
  const dark = await readBackground(page);

  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload();
  await expect(background(page)).not.toHaveCSS('background-color', dark);
});
