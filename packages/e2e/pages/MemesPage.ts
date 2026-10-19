import type { Locator, Page } from '@playwright/test';

export class MemesPage {
  readonly heading: Locator;
  readonly memeButtons: Locator;
  readonly lightbox: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.memeButtons = page.getByRole('button', { name: /^View meme/ });
    this.lightbox = page.getByRole('dialog');
  }

  async goto() {
    await this.page.goto('/memes');
  }
}
