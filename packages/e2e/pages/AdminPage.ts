import type { Locator, Page } from '@playwright/test';
import { EntryForm } from './EntryForm';

/** The admin console: the pending queue, the speakers list and the entry editor. */
export class AdminPage extends EntryForm {
  readonly nav: Locator;
  readonly signOut: Locator;
  readonly status: Locator;
  readonly save: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = page.getByRole('navigation', { name: 'Admin' });
    this.signOut = page.getByRole('button', { name: 'Sign out' });
    this.status = page.getByLabel('Status');
    this.save = page.getByRole('button', { name: 'Save', exact: true });
  }

  async goto() {
    await this.page.goto('/admin');
  }

  async openSpeakers() {
    await this.nav.getByRole('link', { name: 'Speakers' }).click();
  }

  /** The queue item for the submission by `submitter`. */
  queueItem(submitter: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: `Submitted by ${submitter}` });
  }

  /** A speaker's row on the speakers page, found by the name field a moderator would type in. */
  speakerRow(name: string): Locator {
    return this.page
      .getByRole('listitem')
      .filter({ has: this.page.getByLabel(`New name for ${name}`) });
  }
}
