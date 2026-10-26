import type { Locator, Page } from '@playwright/test';

export class SpeakerPage {
  readonly heading: Locator;
  readonly indexHeading: Locator;
  readonly count: Locator;
  /** A speaker page's points line: points, rank, and who to pass next. */
  readonly standing: Locator;
  readonly entries: Locator;
  readonly allSpeakers: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.indexHeading = page.getByRole('heading', { level: 1, name: 'Speakers' });
    this.count = page.getByText(/^\d+ lines? in \d+ Aaronisms?$/);
    this.standing = page.getByText(/^\d+ points?, #\d+ of \d+\./);
    this.entries = page.getByRole('article');
    this.allSpeakers = page.getByRole('link', { name: 'All speakers' });
  }

  /** Only for a link a visitor might have been sent. */
  async goto(slug: string) {
    return this.page.goto(`/speakers/${slug}`);
  }

  /** A speaker's link on the index, named with its rank (by points only), points and lines. */
  indexLink(name: string): Locator {
    return this.page.getByRole('link', {
      name: new RegExp(`^(#\\d+\\s*)?${name}\\s*\\d+ points? · \\d+ lines?$`),
    });
  }

  /** "By points" or "A to Z" above the index. */
  sortLink(name: 'By points' | 'A to Z'): Locator {
    return this.page
      .getByRole('navigation', { name: 'Sort speakers' })
      .getByRole('link', { name, exact: true });
  }
}
