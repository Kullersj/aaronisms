import { SubmitPage } from '../pages/SubmitPage';
import { findEntry } from '../fixtures/db';
import { expect, test } from '../fixtures/test';

test.describe('submit dialog', () => {
  test('opens over the feed, sends an entry and confirms in the dialog', async ({
    page,
    marker,
  }) => {
    await page.goto('/');
    // An open dialog hides the page from the accessibility tree, so look it up by CSS.
    const feedEntry = page.locator('article').first();
    await expect(feedEntry).toBeVisible();
    const submit = await SubmitPage.openFromHeader(page);
    await expect(page).toHaveURL(/\/submit$/);
    await expect(feedEntry).toBeVisible();

    await submit.chooseSpeaker(1, `${marker} Speaker`, { isNew: true });
    await submit.fillLine(1, `A quote from ${marker}`);
    await submit.name.fill(marker);
    await submit.submit.click();
    await expect(submit.thanks).toBeVisible();
    expect((await findEntry(marker))?.status).toBe('pending');

    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test('Escape returns to the same page with its content intact', async ({ page }) => {
    await page.goto('/speakers');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    const title = await heading.textContent();
    await SubmitPage.openFromHeader(page);
    await expect(heading).toHaveText(title ?? '');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/speakers$/);
    await expect(heading).toHaveText(title ?? '');
  });

  test('browser Back closes it', async ({ page }) => {
    await page.goto('/memes');
    await SubmitPage.openFromHeader(page);
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/memes$/);
  });

  test('scrolls on a phone when the form is taller than the screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 500 });
    await page.goto('/');
    const submit = await SubmitPage.openFromHeader(page);
    await submit.submit.scrollIntoViewIfNeeded();
    await expect(submit.submit).toBeInViewport();
  });

  test('a direct visit still shows the full page', async ({ page }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await expect(submit.heading).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
