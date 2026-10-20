import { createClient } from '@supabase/supabase-js';
import type { BrowserContext, Page } from '@playwright/test';
import type { Database } from '@aaronisms/db/database.types';
import { serviceClient } from '../../fixtures/db';
import { ADMIN_STATE, moderators, requireEnv } from '../../fixtures/env';
import { followSignInLink, requestSignInLink, signInAsAdmin } from '../../fixtures/admin';
import { countSignInEmailsTo, moderationLinks, waitForEmail } from '../../fixtures/mailpit';
import { test, expect } from '../../fixtures/test';
import { FeedPage } from '../../pages/FeedPage';
import { AdminPage } from '../../pages/AdminPage';
import { ModeratePage } from '../../pages/ModeratePage';
import { SubmitPage } from '../../pages/SubmitPage';

const [first, second] = moderators();

/** A fresh client address, so a test's sign-ins never share a rate-limit bucket with another's. */
function randomIp() {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
}

/** Signs in with a password through the API and hands the session to the browser as its cookie. */
async function addPasswordSession(context: BrowserContext, email: string, password: string) {
  const url = requireEnv('SUPABASE_URL');
  const anon = createClient<Database>(url, requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
  });
  const { data } = await anon.auth.signInWithPassword({ email, password });
  const session = Buffer.from(JSON.stringify(data.session)).toString('base64url');
  await context.addCookies([
    {
      name: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`,
      value: `base64-${session}`,
      url: process.env.BASE_URL ?? 'http://localhost:3000',
    },
  ]);
}

async function submitPending(page: Page, marker: string, text: string) {
  const submit = new SubmitPage(page);
  await submit.submitQuote({ submitter: marker, speaker: `${marker} Speaker`, text });
  await expect(submit.thanks).toBeVisible();
}

async function feedShows(page: Page, text: string) {
  const feed = new FeedPage(page);
  await feed.goto();
  await expect(feed.allAaronisms).toBeAttached();
  return (await page.getByText(text).count()) > 0;
}

test.describe('admin, signed in as the default moderator', () => {
  test.use({ storageState: ADMIN_STATE });

  test('approves a pending submission from the queue', async ({ page, marker }) => {
    const quote = `Queue approve ${marker}`;
    await submitPending(page, marker, quote);

    const admin = new AdminPage(page);
    await admin.goto();
    const item = admin.queueItem(marker);
    await expect(item.getByText(quote)).toBeVisible();
    await item.getByRole('button', { name: 'Approve' }).click();
    await expect(admin.queueItem(marker)).toHaveCount(0);

    expect(await feedShows(page, quote)).toBe(true);

    // The other moderator's email link now shows who approved it.
    const links = moderationLinks(await waitForEmail(second, marker));
    const moderate = new ModeratePage(page);
    await moderate.goto(links.approve);
    await expect(moderate.notice('Already approved')).toBeVisible();
    await expect(page.getByText(`Approved by ${first}`)).toBeVisible();
  });

  test('rejects a pending submission from the queue with a reason', async ({ page, marker }) => {
    const quote = `Queue reject ${marker}`;
    await submitPending(page, marker, quote);
    const admin = new AdminPage(page);
    await admin.goto();
    const item = admin.queueItem(marker);
    await item.getByText('Reject…').click();
    await item.getByLabel('Reason (optional)').fill('Too inside');
    await item.getByRole('button', { name: 'Reject', exact: true }).click();
    await expect(admin.queueItem(marker)).toHaveCount(0);
    expect(await feedShows(page, quote)).toBe(false);

    const links = moderationLinks(await waitForEmail(second, marker));
    const moderate = new ModeratePage(page);
    await moderate.goto(links.approve);
    await expect(moderate.notice('Already rejected')).toBeVisible();
    await expect(page.getByText('Reason: Too inside')).toBeVisible();
  });

  test('edits a pending submission and approves it in one step', async ({ page, marker }) => {
    await submitPending(page, marker, `Before ${marker}`);
    const admin = new AdminPage(page);
    await admin.goto();
    await admin.queueItem(marker).getByRole('link', { name: 'Edit before approving' }).click();
    await expect(admin.line(1)).toHaveValue(`Before ${marker}`);
    await admin.fillLine(1, `After ${marker}`);
    await admin.saveAndApprove.click();
    await expect(page.getByText('Saved and approved.')).toBeVisible();

    expect(await feedShows(page, `After ${marker}`)).toBe(true);
    expect(await feedShows(page, `Before ${marker}`)).toBe(false);
  });

  test('edits a published entry and takes it down by changing its status', async ({
    page,
    context,
    marker,
  }) => {
    // A second tab stands in for a visitor reading the site while the admin works.
    const visitor = await context.newPage();
    await submitPending(page, marker, `Original ${marker}`);
    const admin = new AdminPage(page);
    await admin.goto();
    await admin.queueItem(marker).getByRole('link', { name: 'Edit before approving' }).click();
    await admin.saveAndApprove.click();
    await expect(page.getByText('Saved and approved.')).toBeVisible();
    await expect.poll(() => feedShows(visitor, `Original ${marker}`)).toBe(true);

    // The editor now offers a status to change, showing the one the entry has.
    await expect(admin.status).toHaveValue('published');

    // Saving an edit without touching the status keeps the entry published.
    await admin.fillLine(1, `Edited ${marker}`);
    await admin.save.click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await expect.poll(() => feedShows(visitor, `Edited ${marker}`)).toBe(true);
    await expect.poll(() => feedShows(visitor, `Original ${marker}`)).toBe(false);

    await admin.status.selectOption('rejected');
    await admin.save.click();
    // The first "Saved." toast may still be showing, so the visitor's feed is the proof here.
    await expect.poll(() => feedShows(visitor, `Edited ${marker}`)).toBe(false);
  });

  test('finds a published entry, deletes it softly and restores it', async ({ page, marker }) => {
    const quote = `Delete me ${marker}`;
    await submitPending(page, marker, quote);
    const admin = new AdminPage(page);
    await admin.goto();
    await admin.queueItem(marker).getByRole('button', { name: 'Approve' }).click();
    await expect(admin.queueItem(marker)).toHaveCount(0);
    expect(await feedShows(page, quote)).toBe(true);

    const openFromList = async () => {
      await admin.goto();
      await admin.nav.getByRole('link', { name: 'Entries' }).click();
      await page.getByLabel('Filter entries').fill(quote);
      await page.getByRole('button', { name: 'Filter' }).click();
      return page.getByRole('listitem').filter({ hasText: quote });
    };
    let item = await openFromList();
    await expect(item.getByText('Published')).toBeVisible();
    const edit = item.getByRole('link', { name: /^Edit entry / });
    const slug = ((await edit.getAttribute('aria-label')) ?? '').replace('Edit entry ', '');
    await edit.click();

    await page.getByText('Delete entry…').click();
    await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/entries\?message=/);
    await expect(page.getByText('Entry deleted.')).toBeVisible();

    // Off the site, but still listed for the admin as deleted.
    expect(await feedShows(page, quote)).toBe(false);
    expect((await page.goto(`/a/${slug}`))?.status()).toBe(404);
    item = await openFromList();
    await expect(item.getByText('Deleted')).toBeVisible();

    // Restoring is a status change on the edit page.
    await item.getByRole('link', { name: `Edit entry ${slug}` }).click();
    await expect(page.getByText('Delete entry…')).toHaveCount(0);
    await admin.status.selectOption('published');
    await admin.save.click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await expect.poll(() => feedShows(page, quote)).toBe(true);
  });

  test('renames and merges speakers', async ({ page, marker }) => {
    await submitPending(page, marker, `Speaker test ${marker}`);
    // Setup: a second speaker to merge into, which a visitor could only make with a submission.
    const target = `${marker} Target`;
    await serviceClient()
      .from('speakers')
      .insert({ name: target, slug: `${marker}-target` });

    const admin = new AdminPage(page);
    await admin.goto();
    await admin.openSpeakers();
    const row = admin.speakerRow(`${marker} Speaker`);
    await row.getByLabel(`New name for ${marker} Speaker`).fill(`${marker} Renamed`);
    await row.getByRole('button', { name: 'Rename' }).click();
    await expect(page.getByText(`Renamed to ${marker} Renamed.`)).toBeVisible();

    const renamed = admin.speakerRow(`${marker} Renamed`);
    await expect(renamed.getByText('1 line')).toBeVisible();
    await renamed.getByLabel(`Merge ${marker} Renamed into`).selectOption({ label: target });
    await renamed.getByRole('button', { name: 'Merge' }).click();
    await expect(page.getByText('Merged.')).toBeVisible();

    await expect(admin.speakerRow(`${marker} Renamed`)).toHaveCount(0);
    await expect(admin.speakerRow(target).getByText('1 line')).toBeVisible();
  });

  test('moves between the queue and speakers from the admin nav', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await admin.openSpeakers();
    await expect(page).toHaveURL(/\/admin\/speakers$/);
    await admin.nav.getByRole('link', { name: 'Queue' }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe('admin, everyone else', () => {
  test('signing out ends that session only', async ({ browser, clientIpHeaders }) => {
    // Its own sign-in, so signing out cannot end the session the other tests share.
    const context = await browser.newContext({ extraHTTPHeaders: clientIpHeaders });
    const page = await context.newPage();
    await signInAsAdmin(page);
    await new AdminPage(page).signOut.click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    await context.close();
  });

  test('a signed-out visitor is sent to the login page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin/entries');
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin/speakers');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('any moderator, not only the default, can sign in', async ({ browser, clientIpHeaders }) => {
    const context = await browser.newContext({ extraHTTPHeaders: clientIpHeaders });
    const page = await context.newPage();
    await signInAsAdmin(page, second);
    for (const path of ['/admin/entries', '/admin/speakers']) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
    await context.close();
  });

  test('two moderators who ask for links at the same time both get in', async ({ browser }) => {
    const contexts = await Promise.all(
      [first, second].map(() =>
        browser.newContext({ extraHTTPHeaders: { 'x-vercel-forwarded-for': randomIp() } }),
      ),
    );
    try {
      const pages = await Promise.all(contexts.map((context) => context.newPage()));
      const links = await Promise.all(
        [first, second].map((email, i) => requestSignInLink(pages[i]!, email)),
      );
      await Promise.all(links.map((link, i) => followSignInLink(pages[i]!, link)));
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });

  test('a sign-in link works in a different browser from the one that asked for it', async ({
    browser,
    clientIpHeaders,
  }) => {
    // A moderator asks on a laptop and opens the email on a phone, or in a mail app's own browser.
    const asking = await browser.newContext({ extraHTTPHeaders: clientIpHeaders });
    const opening = await browser.newContext({ extraHTTPHeaders: clientIpHeaders });
    try {
      const link = await requestSignInLink(await asking.newPage(), second);
      // A mail scanner fetching the link first must not use up the one-time token.
      expect((await opening.request.get(link)).ok()).toBe(true);
      await followSignInLink(await opening.newPage(), link);
    } finally {
      await asking.close();
      await opening.close();
    }
  });

  test('an address that is not a moderator gets no sign-in link', async ({
    page,
    browser,
    clientIpHeaders,
  }) => {
    const outsider = `outsider-${crypto.randomUUID().slice(0, 8)}@example.com`;
    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill(outsider);
    await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
    // The reply is the same as for a moderator, so the form reveals nothing.
    await expect(page.getByText('a link is on its way')).toBeVisible();

    // Mail is sent in the order requested, so once a moderator's link has arrived, a link for
    // the outsider would have too.
    const context = await browser.newContext({ extraHTTPHeaders: clientIpHeaders });
    await signInAsAdmin(await context.newPage());
    await context.close();
    expect(await countSignInEmailsTo(outsider)).toBe(0);
  });

  test('a signed-in non-moderator is turned away from every admin page', async ({
    page,
    context,
  }) => {
    const admin = serviceClient();
    const email = `outsider-${crypto.randomUUID().slice(0, 8)}@example.com`;
    const password = crypto.randomUUID();
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    try {
      await addPasswordSession(context, email, password);
      for (const path of ['/admin', '/admin/entries', '/admin/speakers']) {
        await page.goto(path);
        await expect(page).toHaveURL(/\/admin\/login\?error=forbidden/);
        await expect(page.getByText('That account is not allowed to use the admin.')).toBeVisible();
      }
    } finally {
      await admin.auth.admin.deleteUser(created.data.user?.id ?? '');
    }
  });

  test('a password session for the admin address is not an admin session', async ({
    page,
    context,
  }) => {
    // Only a magic link proves control of the inbox. The admin account already exists from the
    // shared sign-in; give it a throwaway password and sign in with that instead.
    const admin = serviceClient();
    const [defaultModerator = ''] = moderators();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const user = data.users.find((candidate) => candidate.email === defaultModerator);
    expect(user).toBeDefined();
    const password = crypto.randomUUID();
    expect((await admin.auth.admin.updateUserById(user?.id ?? '', { password })).error).toBeNull();

    await addPasswordSession(context, defaultModerator, password);
    for (const path of ['/admin', '/admin/entries', '/admin/speakers']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login\?error=forbidden/);
    }
  });
});
