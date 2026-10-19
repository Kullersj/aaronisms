import type { Page } from '@playwright/test';

/**
 * Finds social card URLs the way a crawler would: from the page's own `og:image` tag. Next adds
 * a content hash to the route (`/opengraph-image-p9p5fa`), so the path cannot be hard-coded.
 */
export class OgImage {
  constructor(private readonly page: Page) {}

  /** Path and query of the card the page at `path` advertises. */
  async advertisedBy(path: string): Promise<string> {
    await this.page.goto(path);
    const content = await this.page
      .locator('meta[property="og:image"]')
      .getAttribute('content', { timeout: 5000 });
    if (!content) throw new Error(`${path} has no og:image tag`);
    const url = new URL(content);
    return `${url.pathname}${url.search}`;
  }

  /** The same card route for another entry, which may not be published and so has no tag. */
  static forSlug(cardPath: string, from: string, to: string): string {
    return cardPath.replace(`/a/${from}/`, `/a/${to}/`);
  }
}
