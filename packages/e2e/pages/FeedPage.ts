import type { Locator, Page } from '@playwright/test';

export class FeedPage {
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Aaronisms' });
  }

  async goto() {
    await this.page.goto('/');
  }
}
