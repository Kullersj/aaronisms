import { expect, test } from '@playwright/test';
import { OgImage } from '../../pages/OgImage';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

test.describe('OG images', () => {
  test('a published entry has a PNG card that is not indexable', async ({ page, request }) => {
    const card = await new OgImage(page).advertisedBy('/a/2026-02-14-1');
    expect(card).toMatch(/^\/a\/2026-02-14-1\/opengraph-image/);

    const response = await request.get(card);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    const body = await response.body();
    expect([...body.subarray(0, 4)]).toEqual(PNG_MAGIC);
    expect(body.length).toBeGreaterThan(2000);
  });

  test('pending, rejected and unknown entries render no card', async ({ page, request }) => {
    const card = await new OgImage(page).advertisedBy('/a/2026-02-14-1');
    for (const slug of ['2026-03-01-1', '2026-03-02-1', 'does-not-exist']) {
      const response = await request.get(OgImage.forSlug(card, '2026-02-14-1', slug));
      expect(response.status()).toBe(404);
      expect(response.headers()['content-type']).not.toContain('image/png');
    }
  });

  test('the site has a default card too', async ({ page, request }) => {
    const card = await new OgImage(page).advertisedBy('/college');
    expect(card).toMatch(/^\/opengraph-image/);
    const response = await request.get(card);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    expect(response.headers()['x-robots-tag']).toContain('noindex');
  });
});
