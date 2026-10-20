import type { Page } from '@playwright/test';
import { serviceClient, findEntry } from '../../fixtures/db';
import { moderators } from '../../fixtures/env';
import { moderationLinks, waitForEmail } from '../../fixtures/mailpit';
import { test, expect } from '../../fixtures/test';
import { FeedPage } from '../../pages/FeedPage';
import { ModeratePage } from '../../pages/ModeratePage';
import { SearchPage } from '../../pages/SearchPage';
import { SubmitPage } from '../../pages/SubmitPage';

const [first, second] = moderators();

/** A visitor submits a quote; both moderators' links are read from the emails the site sent. */
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

/** Whether a visitor looking at the feed can see `text`. */
async function feedShows(page: Page, text: string) {
  const feed = new FeedPage(page);
  await feed.goto();
  await expect(feed.allAaronisms).toBeAttached();
  return (await page.getByText(text).count()) > 0;
}

test.describe('moderation by email link', () => {
  test('emails every moderator, then approving from the email publishes the entry', async ({
    page,
    marker,
    request,
  }) => {
    const quote = `Approved quote ${marker}`;
    const links = await submitAndCollectLinks(page, marker, quote);

    // The email names the submitter, quotes the entry and replies to the default moderator.
    expect(links.emailSecond.subject).toMatch(/^New submission/);
    expect(links.emailSecond.subject).not.toContain(marker);
    expect(links.emailSecond.replyTo).toBe(first);
    expect(links.emailSecond.html).toContain(quote);
    expect(links.emailSecond.html).toContain('Edit before approving');

    // Mail scanners fetch every link in an email. That must only display the submission.
    for (const link of Object.values(links.second)) {
      expect((await request.get(link)).status()).toBe(200);
    }

    const moderate = new ModeratePage(page);
    await moderate.goto(links.second.approve);
    await expect(page.getByText(quote)).toBeVisible();
    await expect(page.getByText(`Submitted by ${marker}`)).toBeVisible();
    await expect(moderate.hint).toBeVisible();
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    // Reloading, which a scanner or an impatient click might do, still changes nothing.
    await page.reload();
    await expect(moderate.approve).toBeVisible();
    expect(await feedShows(page, quote)).toBe(false);

    await moderate.goto(links.second.approve);
    await moderate.approve.click();
    await expect(moderate.notice('Approved')).toBeVisible();

    // The entry is on the feed straight away.
    expect(await feedShows(page, quote)).toBe(true);

    // The other moderator sees who decided, with nothing left to click.
    await moderate.goto(links.first.approve);
    await expect(moderate.notice('Already approved')).toBeVisible();
    await expect(page.getByText(`Approved by ${second}`)).toBeVisible();
    await expect(moderate.approve).toHaveCount(0);
    await expect(moderate.reject).toHaveCount(0);
  });

  test('rejecting with a reason keeps the entry off the site and tells the other moderator', async ({
    page,
    marker,
  }) => {
    const quote = `Rejected quote ${marker}`;
    const links = await submitAndCollectLinks(page, marker, quote);

    const moderate = new ModeratePage(page);
    await moderate.goto(links.first.reject);
    await expect(moderate.reason).toBeVisible();
    await moderate.reason.fill('Not for this site');
    await moderate.reject.click();
    await expect(moderate.notice('Rejected')).toBeVisible();

    expect(await feedShows(page, quote)).toBe(false);
    const search = new SearchPage(page);
    await search.search(quote);
    await expect(search.noMatches(quote)).toBeVisible();

    await moderate.goto(links.second.approve);
    await expect(moderate.notice('Already rejected')).toBeVisible();
    await expect(page.getByText(`Rejected by ${first}`)).toBeVisible();
    await expect(page.getByText('Reason: Not for this site')).toBeVisible();
    await expect(moderate.approve).toHaveCount(0);
  });

  test('editing before approving fixes the text and date, then publishes', async ({
    page,
    marker,
  }) => {
    const links = await submitAndCollectLinks(page, marker, `Typo quote ${marker}`);

    const moderate = new ModeratePage(page);
    await moderate.goto(links.first.approve);
    await moderate.edit.click();
    await expect(moderate.context).toBeVisible();
    await expect(moderate.line(1)).toHaveValue(`Typo quote ${marker}`);
    await moderate.date.fill('2026-05-05');
    await moderate.context.fill('Fixed setup:');
    await moderate.fillLine(1, `Fixed quote ${marker}`);
    await moderate.addStage.click();
    await moderate.fillStage(2, 'Applause.');
    await moderate.saveAndApprove.click();
    await expect(moderate.notice('Approved')).toBeVisible();

    const feed = new FeedPage(page);
    await feed.goto();
    const entry = feed.entryOn('May 5, 2026');
    await expect(entry.getByText('Fixed setup:')).toBeVisible();
    await expect(entry.getByText(`Fixed quote ${marker}`)).toBeVisible();
    await expect(entry.getByText('[Applause.]')).toBeVisible();
    await expect(page.getByText(`Typo quote ${marker}`)).toHaveCount(0);

    // And it has its own page under the new date.
    await feed.permalinkFor('May 5, 2026').click();
    await expect(page).toHaveURL(/\/a\/2026-05-05-\d+$/);
    await expect(page.getByText(`Fixed quote ${marker}`)).toBeVisible();
  });

  test('editing shows what is wrong and publishes nothing', async ({ page, marker }) => {
    const quote = `Quote ${marker}`;
    const links = await submitAndCollectLinks(page, marker, quote);
    const moderate = new ModeratePage(page);
    await moderate.goto(links.first.edit);
    await moderate.fillLine(1, '');
    await moderate.saveAndApprove.click();
    await expect(page.getByText('Say something')).toBeVisible();

    // Still waiting for review: the link still offers the decision, and the feed lacks it.
    await moderate.goto(links.first.approve);
    await expect(moderate.approve).toBeVisible();
    expect(await feedShows(page, quote)).toBe(false);
  });

  test('an expired link says so and changes nothing', async ({ page, marker }) => {
    const quote = `Expiring ${marker}`;
    const links = await submitAndCollectLinks(page, marker, quote);
    // Setup: a link only expires after two weeks, which a test cannot wait for.
    const entry = await findEntry(marker);
    await serviceClient()
      .from('moderation_tokens')
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('entry_id', entry?.id ?? '');

    const moderate = new ModeratePage(page);
    await moderate.goto(links.first.approve);
    await expect(moderate.notice('This link has expired')).toBeVisible();
    await expect(moderate.approve).toHaveCount(0);
    expect(await feedShows(page, quote)).toBe(false);
  });

  test('a made-up link is not valid', async ({ page }) => {
    const moderate = new ModeratePage(page);
    await moderate.goto(`/moderate/${'A'.repeat(43)}?action=approve`);
    await expect(moderate.notice('This link is not valid')).toBeVisible();
    await moderate.goto('/moderate/not-a-token');
    await expect(moderate.notice('This link is not valid')).toBeVisible();
  });

  test('two moderators deciding at once end with one decision both of them see', async ({
    page,
    marker,
    browser,
    clientIpHeaders,
  }) => {
    const quote = `Race ${marker}`;
    const links = await submitAndCollectLinks(page, marker, quote);
    const otherContext = await browser.newContext({ extraHTTPHeaders: clientIpHeaders });
    const otherPage = await otherContext.newPage();
    const mine = new ModeratePage(page);
    const theirs = new ModeratePage(otherPage);
    await Promise.all([mine.goto(links.first.approve), theirs.goto(links.second.reject)]);
    await Promise.all([mine.approve.click(), theirs.reject.click()]);

    // Exactly one decision stands. Its moderator is told they decided; the other is told it was
    // already decided, not that their own click worked.
    const heading = (p: Page) => p.getByRole('heading', { level: 2 });
    await expect(heading(page)).toHaveText(
      /^(Approved|Rejected|Already approved|Already rejected)$/,
    );
    await expect(heading(otherPage)).toHaveText(
      /^(Approved|Rejected|Already approved|Already rejected)$/,
    );
    const mineText = (await heading(page).textContent()) ?? '';
    const winner = /^Already/.test(mineText) ? 'Rejected' : mineText;
    const pair =
      winner === 'Approved' ? ['Approved', 'Already approved'] : ['Rejected', 'Already rejected'];
    const [winnerPage, loserPage] = /^Already/.test(mineText)
      ? [otherPage, page]
      : [page, otherPage];
    await expect(heading(winnerPage)).toHaveText(pair[0] ?? '');
    await expect(heading(loserPage)).toHaveText(pair[1] ?? '');
    // The standing decision carries the name of the moderator who made it.
    await mine.goto(links.first.approve);
    await expect(
      page.getByText(winner === 'Approved' ? `Approved by ${first}` : `Rejected by ${second}`),
    ).toBeVisible();
    expect(await feedShows(page, quote)).toBe(winner === 'Approved');
    await otherContext.close();
  });
});
