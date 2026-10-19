import { expect, test } from '@playwright/test';
import { SEED } from '../../fixtures/seed';
import { OgImage } from '../../pages/OgImage';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const { lighthouse } = SEED.published;

// Request-level on purpose: social cards are fetched by link-preview crawlers, never shown in
// the page, so the "user" here is the crawler that reads the og:image tag and downloads it.
test.describe('OG images', () => {
  test('a published entry advertises a PNG card', async ({ page, request }) => {
    const card = await new OgImage(page).advertisedBy(`/a/${lighthouse.slug}`);
    expect(card).toMatch(new RegExp(`^/a/${lighthouse.slug}/opengraph-image`));

    const response = await request.get(card);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    const body = await response.body();
    expect([...body.subarray(0, 4)]).toEqual(PNG_MAGIC);
    expect(body.length).toBeGreaterThan(2000);
  });

  test('pending, rejected and unknown entries render no card', async ({ page, request }) => {
    const card = await new OgImage(page).advertisedBy(`/a/${lighthouse.slug}`);
    for (const slug of [SEED.hidden.pending.slug, SEED.hidden.rejected.slug, 'does-not-exist']) {
      const response = await request.get(OgImage.forSlug(card, lighthouse.slug, slug));
      expect(response.status()).toBe(404);
      expect(response.headers()['content-type']).not.toContain('image/png');
    }
  });

  test('the rest of the site shares a default PNG card', async ({ page, request }) => {
    const card = await new OgImage(page).advertisedBy('/college');
    expect(card).toMatch(/^\/opengraph-image/);
    const response = await request.get(card);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    expect([...(await response.body()).subarray(0, 4)]).toEqual(PNG_MAGIC);
  });
});
