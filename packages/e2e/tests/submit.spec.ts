import { SubmitPage } from '../pages/SubmitPage';
import { findEntry, tokensFor } from '../fixtures/db';
import { moderators } from '../fixtures/env';
import { expect, test } from '../fixtures/test';

test.describe('submit form', () => {
  test('asks for a speaker and a line before sending', async ({ page }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await expect(submit.heading).toBeVisible();
    await submit.submit.click();
    await expect(page.getByText('Who said it?')).toBeVisible();
    await expect(page.getByText('Say something')).toBeVisible();
    await expect(submit.thanks).toHaveCount(0);
  });

  test('defaults the date to today and lets you add stage directions and more lines', async ({
    page,
  }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await expect(submit.date).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    await submit.addLine.click();
    await submit.addStage.click();
    await expect(page.getByLabel('Stage direction 3')).toBeVisible();
    await page.getByRole('button', { name: 'Remove line 2' }).click();
    await expect(page.getByLabel('Stage direction 2')).toBeVisible();
  });

  test('suggests existing speakers and offers to add a new one', async ({ page }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await page.getByRole('combobox', { name: 'Speaker for line 1' }).click();
    const search = page.getByPlaceholder('Search or add a speaker');
    await search.fill('pat');
    await expect(page.getByRole('option', { name: 'Pat Example' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Sam Sample' })).toHaveCount(0);
    await search.fill('Someone New');
    await expect(page.getByRole('option', { name: 'Add “Someone New”' })).toBeVisible();
    await page.getByRole('option', { name: 'Add “Someone New”' }).click();
    await expect(page.getByRole('combobox', { name: 'Speaker for line 1' })).toHaveText(
      /Someone New/,
    );
  });

  test('has no horizontal scroll with a speaker chosen, even on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.chooseSpeaker(1, 'A Speaker With A Rather Long Name Indeed', { isNew: true });
    await submit.fillLine(1, 'Some words '.repeat(20));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
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

  test('saves a pending entry, creates a speaker and hashes one token per moderator', async ({
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

  test('keeps a pending entry off the site', async ({ page, marker, request }) => {
    const submit = new SubmitPage(page);
    await submit.submitQuote({
      submitter: marker,
      speaker: `${marker} Speaker`,
      text: `Hidden ${marker}`,
    });
    await expect(submit.thanks).toBeVisible();
    const entry = await findEntry(marker);
    expect((await request.get(`/a/${entry?.slug}`)).status()).toBe(404);
    await page.goto('/');
    await expect(page.getByText(`Hidden ${marker}`)).toHaveCount(0);
  });

  test('quietly ignores a submission that fills the honeypot', async ({ page, marker }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.chooseSpeaker(1, `${marker} Speaker`, { isNew: true });
    await submit.fillLine(1, 'Bot text');
    await submit.name.fill(marker);
    await page.locator('input[name="website"]').evaluate((input: HTMLInputElement) => {
      input.value = 'https://spam.example';
    });
    await submit.submit.click();
    await expect(submit.thanks).toBeVisible();
    expect(await findEntry(marker)).toBeNull();
  });

  test('uploads a photo with the submission', async ({ page, marker }) => {
    const submit = new SubmitPage(page);
    await submit.goto();
    await submit.chooseSpeaker(1, `${marker} Speaker`, { isNew: true });
    await submit.fillLine(1, 'Look at this');
    await submit.name.fill(marker);
    await submit.photo.setInputFiles({
      name: 'dot.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
        'base64',
      ),
    });
    await submit.submit.click();
    await expect(submit.thanks).toBeVisible();
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
    expect(await findEntry(marker)).toBeNull();
  });
});
