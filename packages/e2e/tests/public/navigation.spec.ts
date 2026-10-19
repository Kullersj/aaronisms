import { expect, test } from '@playwright/test';
import { CollegePage } from '../../pages/CollegePage';
import { FeedPage } from '../../pages/FeedPage';
import { MemesPage } from '../../pages/MemesPage';
import { SiteHeader } from '../../pages/SiteHeader';
import { SpeakerPage } from '../../pages/SpeakerPage';
import { SubmitPage } from '../../pages/SubmitPage';

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

  await header.submitLink.click();
  await expect(new SubmitPage(page).heading).toBeVisible();

  await header.logo.click();
  await expect(feed.allAaronisms).toBeAttached();
  await expect(page).toHaveURL(/\/$/);

  await header.link('Speakers').click();
  await header.link('Home').click();
  await expect(feed.allAaronisms).toBeAttached();
});
