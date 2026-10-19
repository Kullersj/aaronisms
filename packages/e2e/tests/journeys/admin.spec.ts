import { createClient } from '@supabase/supabase-js';
import { expect as baseExpect, type BrowserContext, type Page } from '@playwright/test';
import type { Database } from '@aaronisms/db/database.types';
import { findEntry, serviceClient } from '../../fixtures/db';
import { ADMIN_STATE, moderators, requireEnv } from '../../fixtures/env';
import { signInAsAdmin } from '../../fixtures/admin';
import { countSignInEmailsTo } from '../../fixtures/mailpit';
import { test, expect } from '../../fixtures/test';
import { FeedPage } from '../../pages/FeedPage';
import { SubmitPage } from '../../pages/SubmitPage';

const [, second] = moderators();

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

test.describe('admin, signed in as the default moderator', () => {
  test.use({ storageState: ADMIN_STATE });

  const queueItem = (page: Page, marker: string) =>
    page.getByRole('listitem').filter({ hasText: `Submitted by ${marker}` });

  test('shows the pending queue and approves from it', async ({ page, marker }) => {
    const quote = `Queue approve ${marker}`;
    await submitPending(page, marker, quote);

    await page.goto('/admin');
    const item = queueItem(page, marker);
    await expect(item.getByText(quote)).toBeVisible();
    await item.getByRole('button', { name: 'Approve' }).click();
    await expect(queueItem(page, marker)).toHaveCount(0);

    const entry = await findEntry(marker);
    expect(entry?.status).toBe('published');
    expect(entry?.reviewed_by_email).toBe(moderators()[0]);
    await new FeedPage(page).goto();
    await expect(page.getByText(quote)).toBeVisible();
  });

  test('rejects from the queue with a reason', async ({ page, marker }) => {
    await submitPending(page, marker, `Queue reject ${marker}`);
    await page.goto('/admin');
    const item = queueItem(page, marker);
    await item.getByText('Reject…').click();
    await item.getByLabel('Reason (optional)').fill('Too inside');
    await item.getByRole('button', { name: 'Reject', exact: true }).click();
    await expect(queueItem(page, marker)).toHaveCount(0);
    expect(await findEntry(marker)).toMatchObject({
      status: 'rejected',
      decision_note: 'Too inside',
    });
  });

  test('edits a pending entry and approves it in one step', async ({ page, marker }) => {
    await submitPending(page, marker, `Before ${marker}`);
    await page.goto('/admin');
    await queueItem(page, marker).getByRole('link', { name: 'Edit before approving' }).click();
    await page.getByLabel('What they said, line 1').fill(`After ${marker}`);
    await page.getByLabel('Photo description (alt text)').fill('A description');
    await page.getByRole('button', { name: 'Save and approve' }).click();
    await expect(page.getByText('Saved and approved.')).toBeVisible();

    const entry = await findEntry(marker);
    expect(entry?.status).toBe('published');
    expect(entry?.lines.map((line) => line.text)).toEqual([`After ${marker}`]);
  });

  test('edits and changes the status of a published entry', async ({ page, marker }) => {
    await submitPending(page, marker, `Original ${marker}`);
    const id = (await findEntry(marker))?.id ?? '';
    await page.goto('/admin');
    await queueItem(page, marker).getByRole('button', { name: 'Approve' }).click();
    await expect(queueItem(page, marker)).toHaveCount(0);

    await page.goto(`/admin/entries/${id}`);
    await page.getByLabel('What they said, line 1').fill(`Edited ${marker}`);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await new FeedPage(page).goto();
    await expect(page.getByText(`Edited ${marker}`)).toBeVisible();

    await page.goto(`/admin/entries/${id}`);
    await page.getByLabel('Status').selectOption('rejected');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await new FeedPage(page).goto();
    await expect(page.getByText(`Edited ${marker}`)).toHaveCount(0);
    expect((await findEntry(marker))?.status).toBe('rejected');
  });

  test('finds a published entry and deletes it', async ({ page, marker }) => {
    const quote = `Delete me ${marker}`;
    await submitPending(page, marker, quote);
    const slug = (await findEntry(marker))?.slug ?? '';
    await page.goto('/admin');
    await queueItem(page, marker).getByRole('button', { name: 'Approve' }).click();
    await expect(queueItem(page, marker)).toHaveCount(0);

    await page
      .getByRole('navigation', { name: 'Admin' })
      .getByRole('link', { name: 'Entries' })
      .click();
    await page.getByLabel('Filter entries').fill(quote);
    await page.getByRole('button', { name: 'Filter' }).click();
    await page.getByRole('link', { name: `Edit entry ${slug}` }).click();

    await page.getByText('Delete entry…').click();
    await expect(page.getByText('This cannot be undone.')).toBeVisible();
    expect((await findEntry(marker))?.status).toBe('published');
    await page.getByRole('button', { name: 'Delete for good' }).click();
    await expect(page).toHaveURL(/\/admin\/entries\?message=/);
    await expect(page.getByText('Entry deleted.')).toBeVisible();

    expect(await findEntry(marker)).toBeNull();
    await new FeedPage(page).goto();
    await expect(page.getByText(quote)).toHaveCount(0);
    const permalink = await page.goto(`/a/${slug}`);
    expect(permalink?.status()).toBe(404);
  });

  test('renames and merges speakers', async ({ page, marker }) => {
    await submitPending(page, marker, `Speaker test ${marker}`);
    const target = `${marker} Target`;
    await serviceClient()
      .from('speakers')
      .insert({ name: target, slug: `${marker}-target` });

    // Other rows list this name in their merge menus, so find a row by the name it shows.
    const rowFor = (name: string) =>
      page.getByRole('listitem').filter({ has: page.locator('strong', { hasText: name }) });
    await page.goto('/admin/speakers');
    const row = rowFor(`${marker} Speaker`);
    await row.getByLabel(`New name for ${marker} Speaker`).fill(`${marker} Renamed`);
    await row.getByRole('button', { name: 'Rename' }).click();
    await expect(page.getByText(`Renamed to ${marker} Renamed.`)).toBeVisible();

    const renamed = rowFor(`${marker} Renamed`);
    await expect(renamed.getByText('1 line')).toBeVisible();
    await renamed.getByLabel(`Merge ${marker} Renamed into`).selectOption({ label: target });
    await renamed.getByRole('button', { name: 'Merge' }).click();
    await expect(page.getByText('Merged.')).toBeVisible();

    await expect(page.getByRole('listitem').filter({ hasText: `${marker} Renamed` })).toHaveCount(
      0,
    );
    await expect(rowFor(target).getByText('1 line')).toBeVisible();
    expect((await findEntry(marker))?.lines[0]?.speaker?.name).toBe(target);
  });
});

test.describe('admin, everyone else', () => {
  test('signing out ends that session only', async ({ browser, clientIpHeaders }) => {
    // Its own sign-in, so signing out cannot end the session the other tests share.
    const context = await browser.newContext({ extraHTTPHeaders: clientIpHeaders });
    const page = await context.newPage();
    await signInAsAdmin(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
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

  test('a moderator who is not the default gets no sign-in link', async ({ page }) => {
    const before = await countSignInEmailsTo(second);
    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill(second);
    await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
    // The reply is the same as for the real admin, so the form reveals nothing.
    await expect(page.getByText('a link is on its way')).toBeVisible();
    await baseExpect
      .poll(async () => countSignInEmailsTo(second), { timeout: 3000, intervals: [1000] })
      .toBe(before);
  });

  test('a signed-in non-default moderator is turned away from every admin page', async ({
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
