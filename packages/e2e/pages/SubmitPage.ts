import type { Locator, Page } from '@playwright/test';
import { EntryForm } from './EntryForm';

export class SubmitPage extends EntryForm {
  readonly heading: Locator;
  readonly name: Locator;
  readonly photo: Locator;
  readonly submit: Locator;
  readonly thanks: Locator;
  readonly honeypot: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Submit an Aaronism', level: 1 });
    this.name = page.getByLabel('Your name (optional)');
    this.photo = page.getByLabel('Photo (optional)');
    this.submit = page.getByRole('button', { name: 'Submit for review' });
    this.thanks = page.getByText("Thanks, it's been sent for review.");
    // Hidden from people on purpose; only a bot would find and fill it.
    this.honeypot = page.getByLabel('Leave blank');
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
    await this.goto();
    await this.chooseSpeaker(1, speaker, { isNew: true });
    await this.fillLine(1, text);
    await this.name.fill(submitter);
    await this.submit.click();
  }
}
