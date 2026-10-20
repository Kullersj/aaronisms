import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { test as base, type Browser } from '@playwright/test';
import { deleteTestData, findEntry } from './db';
import { AdminPage } from '../pages/AdminPage';
import { ADMIN_STATE, requireLocalSupabase } from './env';

type Fixtures = {
  /** A unique submitter name; every entry a test submits carries it, so it can be found and cleaned up. */
  marker: string;
  /** This test's fake visitor address, for contexts a test opens itself with `browser.newContext()`. */
  clientIpHeaders: Record<string, string>;
};

/** Takes a published test entry off the site through the admin UI, so the site's cache is purged too. */
async function unpublish(
  browser: Browser,
  headers: Record<string, string>,
  entryId: string,
  slug: string,
) {
  const context = await browser.newContext({
    storageState: ADMIN_STATE,
    extraHTTPHeaders: headers,
  });
  const page = await context.newPage();
  await page.goto(`/admin/entries/${entryId}`);
  const admin = new AdminPage(page);
  await admin.status.selectOption('rejected');
  await admin.save.click();
  await page.getByText('Saved.').waitFor();
  // The site's data cache survives a server restart, but tag expiry does not. Re-read the pages
  // now, so what is cached on disk is the clean state rather than the entry that was just removed.
  for (const path of ['/', '/college', `/a/${slug}`]) await page.goto(path);
  await context.close();
}

export const test = base.extend<Fixtures>({
  // Each test looks like a different visitor, so per-IP rate limits never couple tests together.
  // The site prefers x-vercel-forwarded-for, so that is the header that sets the address.
  // Playwright requires the destructured first argument even when no fixture is used.
  // eslint-disable-next-line no-empty-pattern
  clientIpHeaders: async ({}, use) => {
    const octet = () => Math.floor(Math.random() * 254) + 1;
    await use({ 'x-vercel-forwarded-for': `10.${octet()}.${octet()}.${octet()}` });
  },

  extraHTTPHeaders: async ({ clientIpHeaders }, use) => {
    await use(clientIpHeaders);
  },

  marker: async ({ browser, clientIpHeaders }, use) => {
    // Before the test submits anything: these tests write to the stack behind SUPABASE_URL.
    requireLocalSupabase();
    const marker = `e2e-${randomUUID().slice(0, 8)}`;
    await use(marker);
    const entry = await findEntry(marker);
    if (entry?.status === 'published' && existsSync(ADMIN_STATE))
      await unpublish(browser, clientIpHeaders, entry.id, entry.slug);
    await deleteTestData(marker, marker);
  },
});

export { expect } from '@playwright/test';
