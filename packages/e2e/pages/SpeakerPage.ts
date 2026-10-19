import type { Locator, Page } from '@playwright/test';

export class SpeakerPage {
  readonly heading: Locator;
  readonly count: Locator;
  readonly entries: Locator;
  readonly allSpeakers: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.count = page.getByText(/^\d+ lines? in \d+ Aaronisms?$/);
    this.entries = page.getByRole('article');
    this.allSpeakers = page.getByRole('link', { name: 'All speakers' });
  }

  async goto(slug: string) {
    return this.page.goto(`/speakers/${slug}`);
  }

  async gotoIndex() {
    return this.page.goto('/speakers');
  }

  indexLink(name: string): Locator {
    return this.page.getByRole('link', { name: new RegExp(`^${name}\\s*\\d+ lines?$`) });
  }
}
