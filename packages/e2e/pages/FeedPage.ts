import { expect, type Locator, type Page } from '@playwright/test';

export class FeedPage {
  readonly allAaronisms: Locator;
  readonly entries: Locator;
  readonly yearHeadings: Locator;
  readonly dateHeadings: Locator;

  constructor(private readonly page: Page) {
    this.allAaronisms = page.getByRole('heading', { level: 1, name: 'All Aaronisms' });
    this.entries = page.getByRole('article');
    this.yearHeadings = page.getByRole('heading', { level: 2 });
    this.dateHeadings = page.getByRole('heading', { level: 3 });
  }

  async goto() {
    await this.page.goto('/');
  }

  /** Opens the feed and reports whether a visitor can see `text` on it. */
  async shows(text: string): Promise<boolean> {
    await this.goto();
    await expect(this.allAaronisms).toBeAttached();
    return (await this.page.getByText(text).count()) > 0;
  }

  entryOn(date: string): Locator {
    return this.entries.filter({ has: this.page.getByRole('heading', { name: date, level: 3 }) });
  }

  permalinkFor(date: string, index = 0): Locator {
    return this.page.getByRole('link', { name: date, exact: true }).nth(index);
  }
}
