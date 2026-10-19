import type { Locator, Page } from '@playwright/test';

/** The fields shared by the public submit form and both moderator edit forms. */
export class EntryForm {
  readonly date: Locator;
  readonly context: Locator;
  readonly addLine: Locator;
  readonly addStage: Locator;
  readonly saveAndApprove: Locator;

  /** `root` scopes the fields, e.g. to the dialog when the form is opened over another page. */
  constructor(
    protected readonly page: Page,
    protected readonly root: Page | Locator = page,
  ) {
    this.date = root.getByLabel('When was it said?');
    this.context = root.getByLabel('Setup (optional)');
    this.addLine = root.getByRole('button', { name: 'Add line' });
    this.addStage = root.getByRole('button', { name: 'Add stage direction' });
    this.saveAndApprove = root.getByRole('button', { name: 'Save and approve' });
  }

  line(line: number): Locator {
    return this.root.getByLabel(`What they said, line ${line}`);
  }

  stage(line: number): Locator {
    return this.root.getByLabel(`Stage direction ${line}`);
  }

  removeLine(line: number): Locator {
    return this.root.getByRole('button', { name: `Remove line ${line}` });
  }

  speakerBox(line: number): Locator {
    return this.root.getByRole('combobox', { name: `Speaker for line ${line}` });
  }

  /** Picks an existing speaker, or adds a new one, in the combobox for a line (1-based). */
  async chooseSpeaker(line: number, name: string, { isNew = false } = {}) {
    await this.speakerBox(line).click();
    // The speaker list opens in a portal outside any dialog, so it is found on the page.
    await this.page.getByPlaceholder('Search or add a speaker').fill(name);
    await this.page.getByRole('option', { name: isNew ? `Add “${name}”` : name }).click();
  }

  async fillLine(line: number, text: string) {
    await this.line(line).fill(text);
  }

  async fillStage(line: number, text: string) {
    await this.stage(line).fill(text);
  }
}
