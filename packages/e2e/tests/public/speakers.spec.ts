import { expect, test } from '@playwright/test';
import { SpeakerPage } from '../../pages/SpeakerPage';

test.describe('speakers', () => {
  test('the index lists speakers with their published line counts', async ({ page }) => {
    const speakers = new SpeakerPage(page);
    await speakers.gotoIndex();
    await expect(page.getByRole('heading', { level: 1, name: 'Speakers' })).toBeVisible();
    await expect(speakers.indexLink('Test Aaron')).toContainText('3 lines');
    await expect(speakers.indexLink('Pat Example')).toContainText('1 line');
    // Sam Sample also has a line in a pending entry, which is not counted.
    await expect(speakers.indexLink('Sam Sample')).toContainText('1 line');
  });

  test('a speaker page lists their entries, newest first, with a count', async ({ page }) => {
    const speakers = new SpeakerPage(page);
    const response = await speakers.goto('test-aaron');
    expect(response?.status()).toBe(200);
    await expect(speakers.heading).toHaveText('Test Aaron');
    await expect(speakers.count).toHaveText('3 lines in 3 Aaronisms');
    await expect(speakers.entries).toHaveCount(3);
    await expect(page).toHaveTitle('Test Aaron | Aaronisms');
    // Entries keep every line, including other speakers' and stage directions.
    await expect(speakers.entries.nth(1).getByText('It is mostly a gourd, Test.')).toBeVisible();
    await expect(speakers.entries.getByText('A bicycle is just a horse')).toBeVisible();
  });

  test('does not show pending lines', async ({ page }) => {
    const speakers = new SpeakerPage(page);
    await speakers.goto('sam-sample');
    await expect(speakers.count).toHaveText('1 line in 1 Aaronism');
    await expect(page.getByText('Pending quote about a very patient toaster.')).toHaveCount(0);
  });

  test('unknown speakers are a 404', async ({ page }) => {
    const speakers = new SpeakerPage(page);
    const response = await speakers.goto('nobody-here');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Not found' })).toBeVisible();
  });

  test('speaker names on cards link to the speaker page, and back to the index', async ({
    page,
  }) => {
    await page.goto('/a/2026-01-05-2');
    await page.getByRole('link', { name: 'Pat Example:' }).click();
    await expect(page).toHaveURL(/\/speakers\/pat-example$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Pat Example' })).toBeVisible();
    const speakers = new SpeakerPage(page);
    await speakers.allSpeakers.click();
    await expect(page).toHaveURL(/\/speakers$/);
  });

  test('the nav links to the speakers index', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('link', { name: 'Speakers' }).click();
    await expect(page).toHaveURL(/\/speakers$/);
    await expect(nav.getByRole('link', { name: 'Speakers' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
