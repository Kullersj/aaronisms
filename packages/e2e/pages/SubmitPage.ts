import type { Locator, Page } from '@playwright/test';

export class SubmitPage {
  readonly heading: Locator;
  readonly date: Locator;
  readonly context: Locator;
  readonly name: Locator;
  readonly photo: Locator;
  readonly submit: Locator;
  readonly addLine: Locator;
  readonly addStage: Locator;
  readonly thanks: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Submit an Aaronism', level: 1 });
    this.date = page.getByLabel('When was it said?');
    this.context = page.getByLabel('Setup (optional)');
    this.name = page.getByLabel('Your name (optional)');
    this.photo = page.getByLabel('Photo (optional)');
    this.submit = page.getByRole('button', { name: 'Submit for review' });
    this.addLine = page.getByRole('button', { name: 'Add line' });
    this.addStage = page.getByRole('button', { name: 'Add stage direction' });
    this.thanks = page.getByText("Thanks, it's been sent for review.");
  }

  async goto() {
    await this.page.goto('/submit');
  }

  /** Picks an existing speaker, or adds a new one, in the combobox for a line (1-based). */
  async chooseSpeaker(line: number, name: string, { isNew = false } = {}) {
    await this.page.getByRole('combobox', { name: `Speaker for line ${line}` }).click();
    await this.page.getByPlaceholder('Search or add a speaker').fill(name);
    await this.page.getByRole('option', { name: isNew ? `Add “${name}”` : name }).click();
  }

  async fillLine(line: number, text: string) {
    await this.page.getByLabel(`What they said, line ${line}`).fill(text);
  }

  async fillStage(line: number, text: string) {
    await this.page.getByLabel(`Stage direction ${line}`).fill(text);
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
