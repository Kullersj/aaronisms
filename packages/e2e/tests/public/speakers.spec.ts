import { expect, test } from '@playwright/test';
import { SEED } from '../../fixtures/seed';
import { EntryPage } from '../../pages/EntryPage';
import { FeedPage } from '../../pages/FeedPage';
import { SiteHeader } from '../../pages/SiteHeader';
import { SpeakerPage } from '../../pages/SpeakerPage';

const { testAaron, pat, sam } = SEED.speakers;

test.describe('speakers', () => {
  test.beforeEach(async ({ page }) => {
    await new FeedPage(page).goto();
    await new SiteHeader(page).link('Speakers').click();
    await expect(new SpeakerPage(page).indexHeading).toBeVisible();
  });

  test('the nav opens the index, which lists speakers with their published line counts', async ({
    page,
  }) => {
    const speakers = new SpeakerPage(page);
    await expect(new SiteHeader(page).link('Speakers')).toHaveAttribute('aria-current', 'page');
    await expect(speakers.indexLink(testAaron.name)).toContainText('3 lines');
    await expect(speakers.indexLink(pat.name)).toContainText('1 line');
    // Sam Sample also has a line in a pending entry, which is not counted.
    await expect(speakers.indexLink(sam.name)).toContainText('1 line');
  });

  test('a speaker page lists their entries, newest first, with a count', async ({ page }) => {
    const speakers = new SpeakerPage(page);
    await speakers.indexLink(testAaron.name).click();
    await expect(page).toHaveURL(new RegExp(`/speakers/${testAaron.slug}$`));
    await expect(speakers.heading).toHaveText(testAaron.name);
    await expect(speakers.count).toHaveText(
      `${testAaron.lines} lines in ${testAaron.aaronisms} Aaronisms`,
    );
    await expect(page).toHaveTitle(`${testAaron.name} | Aaronisms`);
    await expect(speakers.entries).toHaveCount(testAaron.aaronisms);
    // Entries keep every line, including other speakers' words.
    await expect(speakers.entries.nth(0).getByText(SEED.published.pumpkin.reply)).toBeVisible();
    await expect(speakers.entries.nth(1).getByText(SEED.published.sandwich.text)).toBeVisible();
    await expect(speakers.entries.nth(2).getByText(SEED.published.bicycle.text)).toBeVisible();
  });

  test('pending lines are not shown or counted', async ({ page }) => {
    const speakers = new SpeakerPage(page);
    await speakers.indexLink(sam.name).click();
    await expect(speakers.count).toHaveText('1 line in 1 Aaronism');
    await expect(page.getByText(SEED.hidden.pending.text)).toHaveCount(0);
    await expect(page.getByText(SEED.published.lighthouse.text)).toBeVisible();
  });

  test('a speaker name on an entry leads to their page, and All speakers back to the index', async ({
    page,
  }) => {
    const speakers = new SpeakerPage(page);
    await new SiteHeader(page).link('Home').click();
    await new FeedPage(page).permalinkFor(SEED.published.pumpkin.date, 0).click();
    await expect(page).toHaveURL(new RegExp(`/a/${SEED.published.pumpkin.slug}$`));
    await expect(new EntryPage(page).article).toBeVisible();
    await page.getByRole('link', { name: `${pat.name}:` }).click();
    await expect(page).toHaveURL(new RegExp(`/speakers/${pat.slug}$`));
    await expect(speakers.heading).toHaveText(pat.name);
    await speakers.allSpeakers.click();
    await expect(page).toHaveURL(/\/speakers$/);
    await expect(speakers.indexHeading).toBeVisible();
  });
});

test('a shared link to an unknown speaker says not found', async ({ page }) => {
  const speakers = new SpeakerPage(page);
  const response = await speakers.goto('nobody-here');
  expect(response?.status()).toBe(404);
  await expect(new EntryPage(page).notFound).toBeVisible();
});
