import { expect, test } from '@playwright/test';
import { CollegePage } from '../../pages/CollegePage';
import { FeedPage } from '../../pages/FeedPage';
import { MemesPage } from '../../pages/MemesPage';
import { SiteHeader } from '../../pages/SiteHeader';
import { SpeakerPage } from '../../pages/SpeakerPage';

// Runs on the desktop and the phone project, so the header must be reachable on both.
test('a visitor can reach every section from the header and get home again', async ({ page }) => {
  const header = new SiteHeader(page);
  const feed = new FeedPage(page);
  await feed.goto();
  await expect(feed.allAaronisms).toBeAttached();

  await header.link('Speakers').click();
  await expect(new SpeakerPage(page).indexHeading).toBeVisible();

  await header.link('College Years').click();
  await expect(new CollegePage(page).heading).toBeVisible();

  await header.link('Memes').click();
  await expect(new MemesPage(page).heading).toHaveText("Don't Let Your Memes Be Dreams");

  // The submit form opens over the current page; Escape puts the visitor back.
  await header.submitLink.click();
  const dialog = page.getByRole('dialog', { name: 'Submit an Aaronism' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await header.logo.click();
  await expect(feed.allAaronisms).toBeAttached();
  await expect(page).toHaveURL(/\/$/);

  await header.link('Speakers').click();
  await expect(new SpeakerPage(page).indexHeading).toBeVisible();
  await header.link('Home').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(feed.allAaronisms).toBeAttached();
  await expect(page.getByText('Peruse at risk', { exact: true })).toBeVisible();
});
