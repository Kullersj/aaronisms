import type { Locator, Page } from '@playwright/test';

export class CollegePage {
  readonly heading: Locator;
  readonly entries: Locator;
  readonly permalink: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'The College Years' });
    this.entries = page.getByRole('article');
    this.permalink = page.getByRole('link', { name: 'Permalink to this entry' });
  }
}
