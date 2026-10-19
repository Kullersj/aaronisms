import { expect as baseExpect, type Page } from '@playwright/test';
import { findEntry, serviceClient, tokensFor } from '../../fixtures/db';
import { moderators } from '../../fixtures/env';
import { moderationLinks, waitForEmail } from '../../fixtures/mailpit';
import { test, expect } from '../../fixtures/test';
import { FeedPage } from '../../pages/FeedPage';
import { ModeratePage } from '../../pages/ModeratePage';
import { SubmitPage } from '../../pages/SubmitPage';

const [first, second] = moderators();

/** Submits a quote and returns both moderators' links, read from the emails the site "sent". */
async function submitAndCollectLinks(page: Page, marker: string, text: string) {
  const submit = new SubmitPage(page);
  await submit.submitQuote({ submitter: marker, speaker: `${marker} Speaker`, text });
  await expect(submit.thanks).toBeVisible();
  const [emailFirst, emailSecond] = await Promise.all([
    waitForEmail(first, marker),
    waitForEmail(second, marker),
  ]);
  return {
    emailFirst,
    emailSecond,
    first: moderationLinks(emailFirst),
    second: moderationLinks(emailSecond),
  };
}

test.describe('moderation by email link', () => {
  test('emails every moderator, with the first as Reply-To, then approve publishes', async ({
    page,
    marker,
    request,
  }) => {
    const quote = `Approved quote ${marker}`;
    const links = await submitAndCollectLinks(page, marker, quote);

    // The email looks like the site card and names the submitter.
    expect(links.emailSecond.subject).toBe(`New Aaronism submitted by ${marker}`);
    expect(links.emailSecond.replyTo).toBe(first);
    expect(links.emailSecond.html).toContain(quote);
    expect(links.emailSecond.html).toContain('Edit before approving');

    // Opening a link, even with action=approve, only displays the submission.
    const pending = await findEntry(marker);
    for (const action of Object.values(links.second)) {
      expect((await request.get(action)).status()).toBe(200);
    }
    expect((await findEntry(marker))?.status).toBe('pending');

    const moderate = new ModeratePage(page);
    await moderate.goto(links.second.approve);
    await expect(page.getByText(quote)).toBeVisible();
    await expect(page.getByText(`Submitted by ${marker}`)).toBeVisible();
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    expect((await findEntry(marker))?.status).toBe('pending');

    await moderate.approve.click();
    await expect(moderate.notice('Approved')).toBeVisible();

    const approved = await findEntry(marker);
    expect(approved?.status).toBe('published');
    expect(approved?.reviewed_by_email).toBe(second);
    const tokens = await tokensFor(pending?.id ?? '');
    expect(tokens.every((token) => token.used_at !== null)).toBe(true);

    // The entry is on the feed straight away.
    const feed = new FeedPage(page);
    await feed.goto();
    await expect(page.getByText(quote)).toBeVisible();

    // The other moderator sees who decided, with nothing left to click.
    await moderate.goto(links.first.approve);
    await expect(moderate.notice('Already approved')).toBeVisible();
    await expect(page.getByText(`Approved by ${second}`)).toBeVisible();
    await expect(moderate.approve).toHaveCount(0);
    await expect(moderate.reject).toHaveCount(0);
  });

  test('reject records the reason and keeps the entry off the site', async ({
    page,
    marker,
    request,
  }) => {
    const quote = `Rejected quote ${marker}`;
    const links = await submitAndCollectLinks(page, marker, quote);

    const moderate = new ModeratePage(page);
    await moderate.goto(links.first.reject);
    await expect(moderate.reason).toBeVisible();
    await moderate.reason.fill('Not for this site');
    await moderate.reject.click();
    await expect(moderate.notice('Rejected')).toBeVisible();

    const entry = await findEntry(marker);
    expect(entry).toMatchObject({
      status: 'rejected',
      decision_note: 'Not for this site',
      reviewed_by_email: first,
    });
    expect((await request.get(`/a/${entry?.slug}`)).status()).toBe(404);

    await moderate.goto(links.second.approve);
    await expect(moderate.notice('Already rejected')).toBeVisible();
    await expect(page.getByText('Not for this site')).toBeVisible();
    expect((await findEntry(marker))?.status).toBe('rejected');
  });

  test('edit before approving fixes the text and date, then publishes', async ({
    page,
    marker,
  }) => {
    const links = await submitAndCollectLinks(page, marker, `Typo quote ${marker}`);

    const moderate = new ModeratePage(page);
    await moderate.goto(links.first.edit);
    await expect(page.getByLabel('Setup (optional)')).toBeVisible();
    await expect(page.getByLabel('What they said, line 1')).toHaveValue(`Typo quote ${marker}`);
    await page.getByLabel('When was it said?').fill('2026-05-05');
    await page.getByLabel('Setup (optional)').fill('Fixed setup:');
    await page.getByLabel('What they said, line 1').fill(`Fixed quote ${marker}`);
    await page.getByRole('button', { name: 'Add stage direction' }).click();
    await page.getByLabel('Stage direction 2').fill('Applause.');
    await page.getByRole('button', { name: 'Save and approve' }).click();
    await expect(moderate.notice('Approved')).toBeVisible();

    const entry = await findEntry(marker);
    expect(entry).toMatchObject({
      status: 'published',
      reviewed_by_email: first,
      said_on: '2026-05-05',
    });
    expect(entry?.slug).toMatch(/^2026-05-05-\d+$/);
    expect(entry?.lines.map((line) => line.text)).toEqual([
      'Fixed setup:',
      `Fixed quote ${marker}`,
      'Applause.',
    ]);

    await new FeedPage(page).goto();
    await expect(page.getByText(`Fixed quote ${marker}`)).toBeVisible();
    await expect(page.getByText(`Typo quote ${marker}`)).toHaveCount(0);
    await expect(page.getByText('[Applause.]')).toBeVisible();
  });

  test('edit shows validation errors and publishes nothing', async ({ page, marker }) => {
    const links = await submitAndCollectLinks(page, marker, `Quote ${marker}`);
    await page.goto(links.first.edit);
    await page.getByLabel('What they said, line 1').fill('');
    await page.getByRole('button', { name: 'Save and approve' }).click();
    await expect(page.getByText('Say something')).toBeVisible();
    expect((await findEntry(marker))?.status).toBe('pending');
  });

  test('an expired link says so and changes nothing', async ({ page, marker }) => {
    const links = await submitAndCollectLinks(page, marker, `Expiring ${marker}`);
    const entry = await findEntry(marker);
    await serviceClient()
      .from('moderation_tokens')
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('entry_id', entry?.id ?? '');

    const moderate = new ModeratePage(page);
    await moderate.goto(links.first.approve);
    await expect(moderate.notice('This link has expired')).toBeVisible();
    await expect(moderate.approve).toHaveCount(0);
    expect((await findEntry(marker))?.status).toBe('pending');
  });

  test('a made-up link is not valid', async ({ page }) => {
    const moderate = new ModeratePage(page);
    await moderate.goto(`/moderate/${'A'.repeat(43)}?action=approve`);
    await expect(moderate.notice('This link is not valid')).toBeVisible();
    await moderate.goto('/moderate/not-a-token');
    await expect(moderate.notice('This link is not valid')).toBeVisible();
  });

  test('two moderators deciding at once: exactly one decision is recorded', async ({
    page,
    marker,
    browser,
    clientIpHeaders,
  }) => {
    const links = await submitAndCollectLinks(page, marker, `Race ${marker}`);
    const other = await (await browser.newContext({ extraHTTPHeaders: clientIpHeaders })).newPage();
    await Promise.all([page.goto(links.first.approve), other.goto(links.second.reject)]);
    await Promise.all([
      page.getByRole('button', { name: 'Approve' }).click(),
      other.getByRole('button', { name: 'Reject', exact: true }).click(),
    ]);
    await baseExpect
      .poll(async () => (await findEntry(marker))?.status, { timeout: 10_000 })
      .not.toBe('pending');
    const decided = await findEntry(marker);
    const winner = decided?.status === 'published' ? first : second;
    expect(decided?.reviewed_by_email).toBe(winner);
    await other.context().close();
  });
});
