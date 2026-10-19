import { expect, test } from '@playwright/test';
import { MemesPage } from '../../pages/MemesPage';

test('meme lightbox opens and closes from the keyboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard interaction is desktop-only');
  const memes = new MemesPage(page);
  await memes.goto();
  await expect(memes.heading).toHaveText("Don't Let Your Memes Be Dreams");
  await expect(memes.memeButtons).toHaveCount(1);

  await memes.memeButtons.first().focus();
  await page.keyboard.press('Enter');
  await expect(memes.lightbox).toBeVisible();
  await expect(
    memes.lightbox.getByRole('heading', { name: 'A made-up meme caption' }),
  ).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(memes.lightbox).toBeHidden();
  await expect(memes.memeButtons.first()).toBeFocused();
});

test('meme lightbox has a close button', async ({ page }) => {
  const memes = new MemesPage(page);
  await memes.goto();
  await memes.memeButtons.first().click();
  await memes.lightbox.getByRole('button', { name: 'Close' }).click();
  await expect(memes.lightbox).toBeHidden();
});
