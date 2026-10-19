import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { test as base, type Browser } from '@playwright/test';
import { deleteTestData, findEntry } from './db';
import { ADMIN_STATE } from './env';

type Fixtures = {
  /** A unique submitter name; every entry a test submits carries it, so it can be found and cleaned up. */
  marker: string;
};

/** Takes a published test entry off the site through the admin UI, so the site's cache is purged too. */
async function unpublish(browser: Browser, entryId: string, slug: string) {
  const context = await browser.newContext({ storageState: ADMIN_STATE });
  const page = await context.newPage();
  await page.goto(`/admin/entries/${entryId}`);
  await page.getByLabel('Status').selectOption('rejected');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Saved.').waitFor();
  // The site's data cache survives a server restart, but tag expiry does not. Re-read the pages
  // now, so what is cached on disk is the clean state rather than the entry that was just removed.
  for (const path of ['/', '/college', `/a/${slug}`]) await page.goto(path);
  await context.close();
}

export const test = base.extend<Fixtures>({
  // Each test looks like a different visitor, so per-IP rate limits never couple tests together.
  // Playwright requires the destructured first argument even when no fixture is used.
  // eslint-disable-next-line no-empty-pattern
  extraHTTPHeaders: async ({}, use) => {
    const octet = () => Math.floor(Math.random() * 254) + 1;
    await use({ 'x-forwarded-for': `10.${octet()}.${octet()}.${octet()}` });
  },

  marker: async ({ browser }, use) => {
    const marker = `e2e-${randomUUID().slice(0, 8)}`;
    await use(marker);
    const entry = await findEntry(marker);
    if (entry?.status === 'published' && existsSync(ADMIN_STATE))
      await unpublish(browser, entry.id, entry.slug);
    await deleteTestData(marker, marker);
  },
});

export { expect } from '@playwright/test';
