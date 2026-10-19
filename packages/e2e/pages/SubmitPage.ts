import type { Locator, Page } from '@playwright/test';
import { EntryForm } from './EntryForm';

export class SubmitPage extends EntryForm {
  readonly heading: Locator;
  readonly name: Locator;
  readonly photo: Locator;
  readonly submit: Locator;
  readonly thanks: Locator;
  readonly honeypot: Locator;

  /** `root` scopes the locators, e.g. to the dialog when the form is opened over another page. */
  constructor(page: Page, root: Page | Locator = page) {
    super(page, root);
    this.heading = root.getByRole('heading', { name: 'Submit an Aaronism', level: 1 });
    this.name = root.getByLabel('Your name (optional)');
    this.photo = root.getByLabel('Photo (optional)');
    this.submit = root.getByRole('button', { name: 'Submit for review' });
    this.thanks = root.getByText("Thanks, it's been sent for review.");
    // Hidden from people on purpose; only a bot would find and fill it.
    this.honeypot = root.getByLabel('Leave blank');
  }

  /** The form as a user meets it: the header button, from whatever page they are on. */
  static async openFromHeader(page: Page): Promise<SubmitPage> {
    await page.getByRole('link', { name: 'Submit an Aaronism' }).click();
    const dialog = page.getByRole('dialog', { name: 'Submit an Aaronism' });
    await dialog.waitFor();
    return new SubmitPage(page, dialog);
  }

  async goto() {
    await this.page.goto('/submit');
  }

  /** Submits a one-line quote by a new speaker from a named submitter. */
  async submitQuote({
    submitter,
    speaker,
    text,
  }: {
    submitter: string;
    speaker: string;
    text: string;
  }) {
    // Scoped to a dialog, the form is already open.
    if (this.root === this.page) await this.goto();
    await this.chooseSpeaker(1, speaker, { isNew: true });
    await this.fillLine(1, text);
    await this.name.fill(submitter);
    await this.submit.click();
  }
}
