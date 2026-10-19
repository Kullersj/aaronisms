import { expect, test } from '@playwright/test';
import { SearchPage } from '../../pages/SearchPage';

test.describe('search', () => {
  test('finds an entry from the header box and highlights the match', async ({ page }) => {
    await page.goto('/');
    const search = new SearchPage(page);
    await search.box.fill('pumpkin');
    await search.box.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=pumpkin$/);
    await expect(search.heading).toBeVisible();
    await expect(search.results).toHaveCount(1);
    await expect(search.results.getByText('That is just a regular pumpkin')).toBeVisible();
    await expect(search.summary).toHaveText('1 result for “pumpkin”');
    await expect(search.highlights.first()).toHaveText(/pumpkin/i);
    await expect(search.box).toHaveValue('pumpkin');
  });

  test('searches speaker names and offers speaker filter chips', async ({ page }) => {
    const search = new SearchPage(page);
    await search.goto('Test Aaron');
    await expect(search.chip(/^Everyone/)).toHaveAttribute('aria-current', 'true');
    await expect(search.chip(/^Test Aaron/)).toBeVisible();
    await expect(search.chip(/^Pat Example/)).toBeVisible();
    const everyone = await search.results.count();
    expect(everyone).toBeGreaterThanOrEqual(3);

    await search.chip(/^Pat Example/).click();
    await expect(page).toHaveURL(/speaker=pat-example/);
    await expect(search.chip(/^Pat Example/)).toHaveAttribute('aria-current', 'true');
    await expect(search.results).toHaveCount(1);
    await expect(search.results.getByText('It is mostly a gourd, Test.')).toBeVisible();

    await search.chip(/^Everyone/).click();
    await expect(page).not.toHaveURL(/speaker=/);
    // Back to the full list: more than the one entry the filter left, and as many as before.
    await expect.poll(() => search.results.count()).toBeGreaterThan(1);
    await expect(search.results).toHaveCount(everyone);
    await expect(search.summary).toHaveText(`${everyone} results for “Test Aaron”`);
  });

  test('shows a prompt without a query', async ({ page }) => {
    const search = new SearchPage(page);
    await search.goto();
    await expect(page.getByText('Search the Aaronisms')).toBeVisible();
    await expect(search.results).toHaveCount(0);
  });

  test('shows a no-results state', async ({ page }) => {
    const search = new SearchPage(page);
    await search.goto('qzxvbnmwk');
    await expect(page.getByText('No Aaronisms match “qzxvbnmwk”')).toBeVisible();
    await expect(search.results).toHaveCount(0);
  });

  test('never finds pending or rejected entries', async ({ page }) => {
    const search = new SearchPage(page);
    for (const word of ['toaster', 'spoon']) {
      await search.goto(word);
      await expect(page.getByText(`No Aaronisms match “${word}”`)).toBeVisible();
    }
  });

  test('treats odd input as plain text', async ({ page }) => {
    const search = new SearchPage(page);
    const response = await search.goto('"unbalanced & | ( <b>x</b> :*');
    expect(response?.status()).toBe(200);
    await expect(page.locator('b', { hasText: 'x' })).toHaveCount(0);
    await expect(search.heading).toBeVisible();
    await expect(page.getByText(/^No Aaronisms match/)).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('ignores a NUL character in the query', async ({ page }) => {
    const search = new SearchPage(page);
    const response = await page.goto('/search?q=pump%00kin');
    expect(response?.status()).toBe(200);
    await expect(search.heading).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await expect(search.results).toHaveCount(1);
    await expect(search.summary).toHaveText('1 result for “pumpkin”');
  });

  test('updates results as you type on the results page', async ({ page }) => {
    const search = new SearchPage(page);
    await search.goto('pumpkin');
    await search.box.fill('lighthouse');
    await expect(page).toHaveURL(/\/search\?q=lighthouse$/);
    await expect(search.results).toHaveCount(1);
    await expect(search.results.getByText('The lighthouse is closed')).toBeVisible();
  });

  test('a speaker name on a result links to their page', async ({ page }) => {
    const search = new SearchPage(page);
    await search.goto('lighthouse');
    await search.results.getByRole('link', { name: 'Sam Sample:' }).click();
    await expect(page).toHaveURL(/\/speakers\/sam-sample$/);
  });

  test('has no horizontal scroll at a phone width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const search = new SearchPage(page);
    await search.goto('Test Aaron');
    await expect(search.results.first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('search without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the header form submits as a plain GET', async ({ page }) => {
    await page.goto('/');
    const search = new SearchPage(page);
    await search.box.fill('lighthouse');
    await search.submit.click();
    await expect(page).toHaveURL(/\/search\?q=lighthouse$/);
    await expect(search.results).toHaveCount(1);
    await expect(search.results.getByText('The lighthouse is closed')).toBeVisible();
  });

  test('speaker chips filter with plain links', async ({ page }) => {
    const search = new SearchPage(page);
    await search.goto('Test Aaron');
    await search.chip(/^Pat Example/).click();
    await expect(page).toHaveURL(/speaker=pat-example/);
    await expect(search.results).toHaveCount(1);
  });
});
