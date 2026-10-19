import type { Locator, Page } from '@playwright/test';

export class ModeratePage {
  readonly approve: Locator;
  readonly rejectSummary: Locator;
  readonly reason: Locator;
  readonly reject: Locator;
  readonly edit: Locator;

  constructor(private readonly page: Page) {
    this.approve = page.getByRole('button', { name: 'Approve' });
    this.rejectSummary = page.getByText('Reject…');
    this.reason = page.getByLabel('Reason (optional)');
    this.reject = page.getByRole('button', { name: 'Reject', exact: true });
    this.edit = page.getByRole('link', { name: 'Edit before approving' });
  }

  async goto(path: string) {
    return this.page.goto(path);
  }

  notice(title: string): Locator {
    return this.page.getByRole('heading', { name: title, level: 2 });
  }
}
