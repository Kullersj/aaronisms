import { expect, test } from '@playwright/test';
import { SEED } from '../../fixtures/seed';
import { tabTo } from '../../fixtures/browser';
import { FeedPage } from '../../pages/FeedPage';
import { MemesPage } from '../../pages/MemesPage';
import { SiteHeader } from '../../pages/SiteHeader';

test.beforeEach(async ({ page }) => {
  await new FeedPage(page).goto();
  await new SiteHeader(page).link('Memes').click();
});

test('a meme opens from the keyboard and Escape returns to it', async ({ page }) => {
  const memes = new MemesPage(page);
  await expect(memes.heading).toHaveText("Don't Let Your Memes Be Dreams");
  await expect(memes.memeButtons).toHaveCount(1);

  await tabTo(page, memes.memeButtons.first());
  await page.keyboard.press('Enter');
  await expect(memes.lightbox).toBeVisible();
  await expect(memes.lightbox.getByRole('heading', { name: SEED.meme.caption })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(memes.lightbox).toBeHidden();
  await expect(memes.memeButtons.first()).toBeFocused();
});

test('a meme opens with a click and closes with its Close button', async ({ page }) => {
  const memes = new MemesPage(page);
  await memes.memeButtons.first().click();
  await expect(memes.lightbox.getByRole('heading', { name: SEED.meme.caption })).toBeVisible();
  await memes.close.click();
  await expect(memes.lightbox).toBeHidden();
});
