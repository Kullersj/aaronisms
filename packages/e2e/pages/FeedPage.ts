import type { Locator, Page } from '@playwright/test';

export class FeedPage {
  readonly heading: Locator;
  readonly entries: Locator;
  readonly yearHeadings: Locator;
  readonly yearNav: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('link', { name: 'Aaronisms', exact: true });
    this.entries = page.getByRole('article');
    this.yearHeadings = page.getByRole('heading', { level: 2 });
    this.yearNav = page.getByRole('navigation', { name: 'Jump to year' });
  }

  async goto() {
    await this.page.goto('/');
  }

  entryOn(date: string): Locator {
    return this.entries.filter({ has: this.page.getByRole('heading', { name: date, level: 3 }) });
  }

  permalinkFor(date: string, index = 0): Locator {
    return this.page.getByRole('link', { name: date, exact: true }).nth(index);
  }
}
