import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, tabTo } from '../../fixtures/browser';
import { SEED } from '../../fixtures/seed';
import { FeedPage } from '../../pages/FeedPage';
import { SearchPage } from '../../pages/SearchPage';
import { SiteHeader } from '../../pages/SiteHeader';
import { SpeakerPage } from '../../pages/SpeakerPage';

const { published, hidden, speakers } = SEED;
/** Entries a search for Test Aaron finds: the three they speak in. */
const TEST_AARON_RESULTS = speakers.testAaron.aaronisms;

test.describe('search', () => {
  test.beforeEach(async ({ page }) => {
    await new FeedPage(page).goto();
  });

  test('finds an entry from the header box and highlights the match', async ({ page }) => {
    const search = new SearchPage(page);
    await search.search('pumpkin');
    await expect(page).toHaveURL(/\/search\?q=pumpkin$/);
    await expect(search.heading).toBeVisible();
    await expect(search.results).toHaveCount(1);
    await expect(search.results.getByText(published.pumpkin.text)).toBeVisible();
    await expect(search.summary).toHaveText('1 result for “pumpkin”');
    // The matched word is the visible text that stands out from the rest of the line.
    await expect(search.results.getByText('pumpkin', { exact: true }).first()).not.toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
    await expect(search.box).toHaveValue('pumpkin');
  });

  test('works from the keyboard alone: Tab to the box, type, Enter', async ({ page }) => {
    const search = new SearchPage(page);
    await tabTo(page, search.box);
    await page.keyboard.type('lighthouse');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=lighthouse$/);
    await expect(search.results.getByText(published.lighthouse.text)).toBeVisible();
  });

  test('searching a speaker name offers speaker chips that narrow and widen the results', async ({
    page,
  }) => {
    const search = new SearchPage(page);
    await search.search(speakers.testAaron.name);
    await expect(search.chip(/^Everyone/)).toHaveAttribute('aria-current', 'true');
    await expect(search.chip(new RegExp(`^${speakers.testAaron.name}`))).toBeVisible();
    await expect(search.chip(new RegExp(`^${speakers.pat.name}`))).toBeVisible();
    await expect(search.results).toHaveCount(TEST_AARON_RESULTS);
    await expect(search.summary).toHaveText(
      `${TEST_AARON_RESULTS} results for “${speakers.testAaron.name}”`,
    );

    await search.chip(new RegExp(`^${speakers.pat.name}`)).click();
    await expect(page).toHaveURL(new RegExp(`speaker=${speakers.pat.slug}`));
    await expect(search.chip(new RegExp(`^${speakers.pat.name}`))).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(search.results).toHaveCount(1);
    await expect(search.results.getByText(published.pumpkin.reply)).toBeVisible();

    await search.chip(/^Everyone/).click();
    await expect(page).not.toHaveURL(/speaker=/);
    await expect(search.results).toHaveCount(TEST_AARON_RESULTS);
  });

  test('shows a prompt when searching an empty box', async ({ page }) => {
    const search = new SearchPage(page);
    await search.submit.click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByText('Search the Aaronisms')).toBeVisible();
    await expect(search.results).toHaveCount(0);
  });

  test('says when nothing matches', async ({ page }) => {
    const search = new SearchPage(page);
    await search.search('qzxvbnmwk');
    await expect(search.noMatches('qzxvbnmwk')).toBeVisible();
    await expect(search.results).toHaveCount(0);
  });

  test('never finds pending or rejected entries', async ({ page }) => {
    const search = new SearchPage(page);
    await search.search(hidden.pending.word);
    await expect(search.noMatches(hidden.pending.word)).toBeVisible();
    await search.search(hidden.rejected.word);
    await expect(search.noMatches(hidden.rejected.word)).toBeVisible();
  });

  test('treats odd input as plain text', async ({ page }) => {
    const search = new SearchPage(page);
    const odd = '"unbalanced & | ( <b>x</b> :*';
    await search.search(odd);
    await expect(search.heading).toBeVisible();
    // The markup is shown as typed rather than interpreted.
    await expect(search.noMatches(odd)).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('updates the results as the visitor types on the results page', async ({ page }) => {
    const search = new SearchPage(page);
    await search.search('pumpkin');
    await expect(search.results.getByText(published.pumpkin.text)).toBeVisible();
    await expect(page).toHaveURL(/\/search\?q=pumpkin$/);
    await search.box.fill('lighthouse');
    await expect(page).toHaveURL(/\/search\?q=lighthouse$/);
    await expect(search.results).toHaveCount(1);
    await expect(search.results.getByText(published.lighthouse.text)).toBeVisible();
  });

  test('a speaker name on a result links to their page', async ({ page }) => {
    const search = new SearchPage(page);
    await search.search('lighthouse');
    await search.results.getByRole('link', { name: `${speakers.sam.name}:` }).click();
    await expect(page).toHaveURL(new RegExp(`/speakers/${speakers.sam.slug}$`));
  });

  test('has no horizontal scroll at a phone width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const search = new SearchPage(page);
    await search.search(speakers.testAaron.name);
    await expect(search.results.first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('a visitor can search from any section', async ({ page }) => {
    const search = new SearchPage(page);
    await new SiteHeader(page).link('Speakers').click();
    await expect(new SpeakerPage(page).indexHeading).toBeVisible();
    await search.search('lighthouse');
    await expect(search.results.getByText(published.lighthouse.text)).toBeVisible();
  });

  // Request-level: a NUL byte cannot be typed, only arrive in a malformed shared link.
  test('a link containing a NUL character still searches the rest', async ({ page }) => {
    const search = new SearchPage(page);
    const response = await search.open('/search?q=pump%00kin');
    expect(response?.status()).toBe(200);
    await expect(search.heading).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await expect(search.results).toHaveCount(1);
    await expect(search.summary).toHaveText('1 result for “pumpkin”');
  });
});

test.describe('search without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the header form submits as a plain GET', async ({ page }) => {
    await new FeedPage(page).goto();
    const search = new SearchPage(page);
    await search.box.fill('lighthouse');
    await search.submit.click();
    await expect(page).toHaveURL(/\/search\?q=lighthouse$/);
    await expect(search.results).toHaveCount(1);
    await expect(search.results.getByText(published.lighthouse.text)).toBeVisible();
  });

  test('speaker chips filter with plain links', async ({ page }) => {
    await new FeedPage(page).goto();
    const search = new SearchPage(page);
    await search.box.fill(speakers.testAaron.name);
    await search.submit.click();
    await search.chip(new RegExp(`^${speakers.pat.name}`)).click();
    await expect(page).toHaveURL(new RegExp(`speaker=${speakers.pat.slug}`));
    await expect(search.results).toHaveCount(1);
  });
});
