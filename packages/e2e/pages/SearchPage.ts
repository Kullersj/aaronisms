import type { Locator, Page } from '@playwright/test';

export class SearchPage {
  /** The search box in the site header, present on every public page. */
  readonly box: Locator;
  readonly submit: Locator;
  readonly heading: Locator;
  readonly results: Locator;
  readonly summary: Locator;
  readonly speakerChips: Locator;
  readonly highlights: Locator;

  constructor(private readonly page: Page) {
    const form = page.getByRole('search');
    this.box = form.getByRole('searchbox', { name: 'Search Aaronisms' });
    this.submit = form.getByRole('button', { name: 'Search' });
    this.heading = page.getByRole('heading', { level: 1, name: 'Search' });
    this.results = page.getByRole('article');
    this.summary = page.getByRole('status');
    this.speakerChips = page.getByRole('navigation', { name: 'Filter by speaker' });
    this.highlights = page.locator('mark');
  }

  async goto(query?: string, speaker?: string) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (speaker) params.set('speaker', speaker);
    const qs = params.toString();
    return this.page.goto(qs ? `/search?${qs}` : '/search');
  }

  chip(name: string | RegExp): Locator {
    return this.speakerChips.getByRole('link', { name });
  }
}
