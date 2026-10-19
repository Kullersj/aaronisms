import { expect, test } from '@playwright/test';
import { SEED } from '../../fixtures/seed';
import { EntryPage } from '../../pages/EntryPage';
import { SiteHeader } from '../../pages/SiteHeader';
import { CollegePage } from '../../pages/CollegePage';
import { FeedPage } from '../../pages/FeedPage';

test.describe('random', () => {
  test('the Random button takes a visitor to a published entry', async ({ page }) => {
    await new FeedPage(page).goto();
    const header = new SiteHeader(page);
    await header.link('College Years').click();
    await expect(new CollegePage(page).heading).toBeVisible();
    await header.random.click();
    await expect(page).toHaveURL(/\/a\/[^/]+$/);
    const slug = new URL(page.url()).pathname.replace('/a/', '');
    expect(SEED.publishedSlugs).toContain(slug);
    await expect(new EntryPage(page).article).toBeVisible();
  });

  // Request-level: a redirect's caching headers are invisible to a visitor, but a cached
  // redirect would send everyone to the same entry.
  test('redirects to a published entry and is never cached', async ({ request }) => {
    const response = await request.get('/random', { maxRedirects: 0 });
    expect([302, 307]).toContain(response.status());
    expect(response.headers()['location']).toMatch(/^\/a\/[^/]+$/);
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('only ever picks published entries, and not always the same one', async ({ request }) => {
    const slugs = new Set<string>();
    for (let i = 0; i < 24; i++) {
      const response = await request.get('/random', { maxRedirects: 0 });
      slugs.add(response.headers()['location']?.replace('/a/', '') ?? '');
    }
    for (const slug of slugs) expect(SEED.publishedSlugs).toContain(slug);
    expect(slugs.size).toBeGreaterThan(1);
  });
});
