import type { Locator, Page } from '@playwright/test';

export class SearchPage {
  /** The search box in the site header, present on every public page. */
  readonly box: Locator;
  readonly submit: Locator;
  readonly heading: Locator;
  readonly results: Locator;
  readonly summary: Locator;
  readonly speakerChips: Locator;

  constructor(private readonly page: Page) {
    const form = page.getByRole('search');
    this.box = form.getByRole('searchbox', { name: 'Search Aaronisms' });
    this.submit = form.getByRole('button', { name: 'Search' });
    this.heading = page.getByRole('heading', { level: 1, name: 'Search' });
    this.results = page.getByRole('article');
    this.summary = page.getByRole('status');
    this.speakerChips = page.getByRole('navigation', { name: 'Filter by speaker' });
  }

  /** Types into the header box and presses Enter, as a visitor does. */
  async search(query: string) {
    await this.box.fill(query);
    await this.box.press('Enter');
  }

  /** Only for a link a visitor might have been sent; everything else should use `search`. */
  async open(path: string) {
    return this.page.goto(path);
  }

  noMatches(query: string): Locator {
    return this.page.getByText(`No Aaronisms match “${query}”`);
  }

  chip(name: string | RegExp): Locator {
    return this.speakerChips.getByRole('link', { name });
  }
}
