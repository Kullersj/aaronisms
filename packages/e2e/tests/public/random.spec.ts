import { expect, test } from '@playwright/test';

const PUBLISHED = ['2026-01-05-1', '2026-01-05-2', '2026-02-14-1', 'college-1'];

test.describe('random', () => {
  test('redirects to a published entry without caching', async ({ request }) => {
    const response = await request.get('/random', { maxRedirects: 0 });
    expect([302, 307]).toContain(response.status());
    expect(response.headers()['location']).toMatch(/^\/a\/[^/]+$/);
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('only ever picks published entries, and varies', async ({ request }) => {
    const slugs = new Set<string>();
    for (let i = 0; i < 24; i++) {
      const response = await request.get('/random', { maxRedirects: 0 });
      slugs.add(response.headers()['location']?.replace('/a/', '') ?? '');
    }
    for (const slug of slugs) expect(PUBLISHED).toContain(slug);
    expect(slugs.size).toBeGreaterThan(1);
  });

  test('the header button lands on an entry page', async ({ page }) => {
    await page.goto('/college');
    await page.getByRole('link', { name: 'Random' }).click();
    await expect(page).toHaveURL(/\/a\/[^/]+$/);
    await expect(page.getByRole('article')).toBeVisible();
  });
});
