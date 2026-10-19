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

  /** `root` scopes the locators, e.g. to the dialog when the form is opened over another page. */
  constructor(
    private readonly page: Page,
    private readonly root: Page | Locator = page,
  ) {
    this.heading = root.getByRole('heading', { name: 'Submit an Aaronism', level: 1 });
    this.date = root.getByLabel('When was it said?');
    this.context = root.getByLabel('Setup (optional)');
    this.name = root.getByLabel('Your name (optional)');
    this.photo = root.getByLabel('Photo (optional)');
    this.submit = root.getByRole('button', { name: 'Submit for review' });
    this.addLine = root.getByRole('button', { name: 'Add line' });
    this.addStage = root.getByRole('button', { name: 'Add stage direction' });
    this.thanks = root.getByText("Thanks, it's been sent for review.");
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

  /** Picks an existing speaker, or adds a new one, in the combobox for a line (1-based). */
  async chooseSpeaker(line: number, name: string, { isNew = false } = {}) {
    await this.root.getByRole('combobox', { name: `Speaker for line ${line}` }).click();
    await this.page.getByPlaceholder('Search or add a speaker').fill(name);
    await this.page.getByRole('option', { name: isNew ? `Add “${name}”` : name }).click();
  }

  async fillLine(line: number, text: string) {
    await this.root.getByLabel(`What they said, line ${line}`).fill(text);
  }

  async fillStage(line: number, text: string) {
    await this.root.getByLabel(`Stage direction ${line}`).fill(text);
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
