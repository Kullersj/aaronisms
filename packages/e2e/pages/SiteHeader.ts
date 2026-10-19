import type { Locator, Page } from '@playwright/test';

/** The header every public page shares: logo, main navigation, Random, theme and Submit. */
export class SiteHeader {
  readonly nav: Locator;
  readonly logo: Locator;
  readonly random: Locator;
  readonly themeToggle: Locator;
  readonly submitLink: Locator;

  constructor(page: Page) {
    this.nav = page.getByRole('navigation', { name: 'Main' });
    this.logo = page.getByRole('link', { name: 'Aaronisms', exact: true });
    this.random = page.getByRole('link', { name: 'Random' });
    this.themeToggle = page.getByRole('button', { name: 'Toggle dark mode' });
    this.submitLink = page.getByRole('link', { name: 'Submit an Aaronism' });
  }

  link(name: 'Home' | 'Speakers' | 'College Years' | 'Memes'): Locator {
    return this.nav.getByRole('link', { name });
  }
}
