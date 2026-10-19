import { expect, test } from '../fixtures/test';
import { expectNoHorizontalScroll, todayIn } from '../fixtures/browser';
import { findEntry, tokensFor } from '../fixtures/db';
import { moderators } from '../fixtures/env';
import { waitForEmail } from '../fixtures/mailpit';
import { FeedPage } from '../pages/FeedPage';
import { SearchPage } from '../pages/SearchPage';
import { SiteHeader } from '../pages/SiteHeader';
import { SubmitPage } from '../pages/SubmitPage';

// A 1x1 PNG.
const DOT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('submit form', () => {
  test('is reached from the header button', async ({ page }) => {
    await new FeedPage(page).goto();
    await new SiteHeader(page).submitLink.click();
    await expect(new SubmitPage(page).heading).toBeVisible();
  });

  test('tells the visitor what is missing before sending', async ({ page }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.submit.click();
    await expect(page.getByRole('alert').filter({ hasText: 'Who said it?' })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Say something' })).toBeVisible();
    await expect(submit.thanks).toHaveCount(0);

    await submit.chooseSpeaker(1, 'Someone New', { isNew: true });
    await submit.fillLine(1, 'Now there is a line');
    await expect(page.getByRole('alert').filter({ hasText: 'Who said it?' })).toHaveCount(0);
    await expect(page.getByRole('alert').filter({ hasText: 'Say something' })).toHaveCount(0);
  });

  test.describe('in a visitor time zone far from the server', () => {
    // UTC+14 is a different calendar day from UTC for half of every day, so a date taken from the
    // server or from UTC fails here.
    const timeZone = 'Pacific/Kiritimati';
    test.use({ timezoneId: timeZone });

    test("defaults the date to the visitor's today", async ({ page }) => {
      const submit = new SubmitPage(page);
      await submit.goto();
      const before = todayIn(timeZone);
      // The server renders its own date; the visitor's appears once the form hydrates. Allows for
      // local midnight passing while the page loads.
      await expect(async () => {
        expect([before, todayIn(timeZone)]).toContain(await submit.date.inputValue());
      }).toPass();
    });
  });

  test('lets a visitor add lines and stage directions and remove them again', async ({ page }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.addLine.click();
    await submit.addStage.click();
    await expect(submit.line(2)).toBeVisible();
    await expect(submit.stage(3)).toBeVisible();
    await submit.removeLine(2).click();
    await expect(submit.stage(2)).toBeVisible();
    await expect(submit.stage(3)).toHaveCount(0);
    await expect(submit.line(2)).toHaveCount(0);
  });

  test('suggests existing speakers and offers to add a new one', async ({ page }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.speakerBox(1).click();
    const search = page.getByPlaceholder('Search or add a speaker');
    await search.fill('pat');
    await expect(page.getByRole('option', { name: 'Pat Example' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Sam Sample' })).toHaveCount(0);
    await search.fill('Someone New');
    await page.getByRole('option', { name: 'Add “Someone New”' }).click();
    await expect(submit.speakerBox(1)).toHaveText(/Someone New/);
  });

  test('has no horizontal scroll with a long speaker and line, even on a phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.chooseSpeaker(1, 'A Speaker With A Rather Long Name Indeed', { isNew: true });
    await submit.fillLine(1, 'Some words '.repeat(20));
    await expectNoHorizontalScroll(page);
  });

  test('rejects a photo that is not an image', async ({ page }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.photo.setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });
    await expect(page.getByText('Image must be a JPEG, PNG, WebP or GIF')).toBeVisible();
  });

  test('rejects a photo over 5 MB', async ({ page }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.photo.setInputFiles({
      name: 'huge.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    await expect(page.getByText('Image must be 5 MB or smaller')).toBeVisible();
  });

  test('sends a submission for review, clears the form and emails every moderator', async ({
    page,
    marker,
  }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.context.fill('During a test:');
    await submit.chooseSpeaker(1, `${marker} Speaker`, { isNew: true });
    await submit.fillLine(1, `A quote from ${marker}`);
    await submit.addStage.click();
    await submit.fillStage(2, 'Everyone applauds.');
    await submit.name.fill(marker);
    await submit.submit.click();
    await expect(submit.thanks).toBeVisible();
    await expect(submit.name).toHaveValue('');
    await expect(submit.line(1)).toHaveValue('');

    // What the moderators receive is the visible result of the submission.
    for (const moderator of moderators()) {
      const email = await waitForEmail(moderator, marker);
      expect(email.html).toContain(`A quote from ${marker}`);
      expect(email.html).toContain('Everyone applauds.');
    }

    // Side effects with no screen: the stored lines and only hashed, unused tokens in the database.
    const entry = await findEntry(marker);
    expect(entry?.status).toBe('pending');
    expect(entry?.lines.map((line) => [line.kind, line.speaker?.name ?? null, line.text])).toEqual([
      ['context', null, 'During a test:'],
      ['line', `${marker} Speaker`, `A quote from ${marker}`],
      ['stage', null, 'Everyone applauds.'],
    ]);
    const tokens = await tokensFor(entry?.id ?? '');
    expect(tokens.map((t) => t.moderator_email).sort()).toEqual([...moderators()].sort());
    for (const token of tokens) {
      expect(token.token_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(token.used_at).toBeNull();
    }
  });

  test('keeps a pending submission off the feed and out of search', async ({ page, marker }) => {
    const submit = new SubmitPage(page);
    await submit.submitQuote({
      submitter: marker,
      speaker: `${marker} Speaker`,
      text: `Hidden ${marker}`,
    });
    await expect(submit.thanks).toBeVisible();

    await new SiteHeader(page).logo.click();
    await expect(new FeedPage(page).allAaronisms).toBeAttached();
    await expect(page.getByText(`Hidden ${marker}`)).toHaveCount(0);

    const search = new SearchPage(page);
    await search.search(`Hidden ${marker}`);
    await expect(search.noMatches(`Hidden ${marker}`)).toBeVisible();
  });

  // A bot, not a visitor: the field is invisible to people, so it is filled in the page directly.
  test('quietly ignores a submission that fills the honeypot', async ({ page, marker }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.chooseSpeaker(1, `${marker} Speaker`, { isNew: true });
    await submit.fillLine(1, 'Bot text');
    await submit.name.fill(marker);
    await submit.honeypot.evaluate((input: HTMLInputElement) => {
      input.value = 'https://spam.example';
    });
    await submit.submit.click();
    await expect(submit.thanks).toBeVisible();
    expect(await findEntry(marker)).toBeNull();
  });

  test('accepts a photo with the submission', async ({ page, marker }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.chooseSpeaker(1, `${marker} Speaker`, { isNew: true });
    await submit.fillLine(1, 'Look at this');
    await submit.name.fill(marker);
    await submit.photo.setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: DOT_PNG });
    await submit.submit.click();
    await expect(submit.thanks).toBeVisible();
    // The photo only shows once a moderator publishes it; here, check it was stored.
    expect((await findEntry(marker))?.image_path).toMatch(/^submissions\/.+\.png$/);
  });

  test('refuses a file that only claims to be an image', async ({ page, marker }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.chooseSpeaker(1, `${marker} Speaker`, { isNew: true });
    await submit.fillLine(1, 'Look at this');
    await submit.name.fill(marker);
    await submit.photo.setInputFiles({
      name: 'sneaky.png',
      mimeType: 'image/png',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    });
    await submit.submit.click();
    await expect(page.getByText('That file is not a supported image.')).toBeVisible();
    await expect(submit.thanks).toHaveCount(0);
    expect(await findEntry(marker)).toBeNull();
  });
});
