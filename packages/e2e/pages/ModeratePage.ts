import type { Locator, Page } from '@playwright/test';
import { EntryForm } from './EntryForm';

/** A moderator's token page, opened from a button in the notification email. */
export class ModeratePage extends EntryForm {
  readonly approve: Locator;
  readonly reason: Locator;
  readonly reject: Locator;
  readonly edit: Locator;
  readonly hint: Locator;

  constructor(page: Page) {
    super(page);
    this.approve = page.getByRole('button', { name: 'Approve' });
    this.reason = page.getByLabel('Reason (optional)');
    this.reject = page.getByRole('button', { name: 'Reject', exact: true });
    this.edit = page.getByRole('link', { name: 'Edit before approving' });
    this.hint = page.getByText('Nothing happens until you press a button below.');
  }

  /** Follows a link from an email. */
  async goto(path: string) {
    return this.page.goto(path);
  }

  notice(title: string): Locator {
    return this.page.getByRole('heading', { name: title, level: 2 });
  }
}
