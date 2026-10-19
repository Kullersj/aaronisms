import type { Locator, Page } from '@playwright/test';

export class EntryPage {
  readonly article: Locator;
  readonly copyLink: Locator;
  readonly backLink: Locator;
  readonly notFound: Locator;

  constructor(private readonly page: Page) {
    this.article = page.getByRole('article');
    this.copyLink = page.getByRole('button', { name: 'Copy link' });
    this.backLink = page.getByRole('link', { name: 'All Aaronisms' });
    this.notFound = page.getByRole('heading', { name: 'Not found' });
  }

  /** Opens a shared permalink directly, as a visitor following a link would. */
  async goto(slug: string) {
    return this.page.goto(`/a/${slug}`);
  }
}
