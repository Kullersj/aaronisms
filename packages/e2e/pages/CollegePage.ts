import type { Locator, Page } from '@playwright/test';

export class CollegePage {
  readonly heading: Locator;
  readonly entries: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'The College Years' });
    this.entries = page.getByRole('article');
  }

  async goto() {
    await this.page.goto('/college');
  }
}
