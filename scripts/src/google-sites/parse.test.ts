import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isGroupLabel, parseGoogleSitesPage, parseImages } from './parse';

const fixture = (name: string) =>
  readFileSync(new URL(`../../test/fixtures/${name}`, import.meta.url), 'utf8');

const home = parseGoogleSitesPage(fixture('home.sample.html'), 'modern');
const byDate = (date: string) => home.filter((entry) => entry.saidOn === date);

/** Minimal Google Sites style section for edge cases. */
const section = (inner: string) => `<section class="yaqOZd">${inner}</section>`;
const dated = (date: string, paragraphs = '') =>
  section(`<h2><span class="C9DxTc">${date}</span></h2>${paragraphs}`);
const bold = (text: string) => `<span style="font-weight: 700;">${text}</span>`;
const italic = (text: string) => `<span style="font-style: italic;">${text}</span>`;

describe('dated pages', () => {
  it('skips the header and nav sections', () => {
    expect(home).toHaveLength(7);
  });

  it('parses dates split across spans, ignoring the copy-link button', () => {
    expect(home.map((entry) => entry.saidOn)).toEqual([
      '2026-10-12',
      '2026-10-12',
      '2026-10-02',
      '2025-12-01',
      '2026-05-02',
      '2025-03-08',
      '2021-09-26',
    ]);
  });

  it('keeps two entries from the same date separate and in page order', () => {
    const [first, second] = byDate('2026-10-12');
    expect(first?.lines).toHaveLength(2);
    expect(second?.lines).toHaveLength(1);
  });

  it('reads the speaker from bold spans and the quote from italic spans', () => {
    expect(byDate('2026-10-12')[0]?.lines[0]).toEqual({
      speakerLabel: 'Pat',
      text: 'Soup is the most underrated food of the year.',
      kind: 'line',
    });
  });

  it('normalises nbsp and repeated whitespace', () => {
    expect(byDate('2026-10-12')[0]?.lines[1]?.text).toBe('Only if it arrives on a plate.');
  });

  it('treats a trailing-colon line without a speaker as context', () => {
    const [entry] = byDate('2026-10-02');
    expect(entry?.lines[0]).toEqual({
      speakerLabel: null,
      text: 'Leaving the hardware store:',
      kind: 'context',
    });
    expect(entry?.lines[1]?.speakerLabel).toBe('Test Aaron');
  });

  it('keeps group labels, including a plain parenthetical, as one speaker label', () => {
    const [entry] = byDate('2025-12-01');
    expect(entry?.lines[1]).toEqual({
      speakerLabel: 'Sam Sample, Pat, and Jo (in unison)',
      text: 'A pudding of flames!',
      kind: 'line',
    });
  });

  it('classifies stage directions, unattributed quotes, plain speakers and narration', () => {
    const [entry] = byDate('2026-05-02');
    expect(entry?.lines).toEqual([
      { speakerLabel: null, text: 'Gets handed six spoons', kind: 'stage' },
      { speakerLabel: 'Test Aaron', text: '*Pouts*', kind: 'line' },
      { speakerLabel: null, text: 'Can I have a fork?', kind: 'line' },
      { speakerLabel: 'Everyone else', text: 'No.', kind: 'line' },
      { speakerLabel: 'Plain Person', text: 'speaking without any styling at all.', kind: 'line' },
      { speakerLabel: null, text: 'A short while later', kind: 'context' },
    ]);
  });

  it('splits a paragraph at <br> and does not mistake a clock time for a speaker', () => {
    const [entry] = byDate('2025-03-08');
    expect(entry?.lines.map((line) => [line.speakerLabel, line.kind])).toEqual([
      ['Test Aaron', 'line'],
      ['Pat', 'line'],
      [null, 'context'],
    ]);
    expect(entry?.lines[2]?.text).toBe('At 9:11 PM:');
  });

  it('records the index of each section, counting the header and nav', () => {
    expect(home.map((entry) => entry.sectionIndex)).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it('collects image sources exactly as written', () => {
    expect(byDate('2021-09-26')[0]?.imageUrls).toEqual(['./home.sample_files/IMG0001']);
    expect(byDate('2026-10-12')[0]?.imageUrls).toEqual([]);
  });

  it('accepts a remote image URL', () => {
    const html = dated(
      'June 5, 2022',
      '<img src="https://lh3.googleusercontent.com/abc123" class="CENy8b">',
    );
    expect(parseGoogleSitesPage(html, 'modern')[0]?.imageUrls).toEqual([
      'https://lh3.googleusercontent.com/abc123',
    ]);
  });

  it('parses single-digit days, ordinals and abbreviated punctuation', () => {
    const html = dated('January 5, 2020') + dated('March 2nd, 2021');
    expect(parseGoogleSitesPage(html, 'modern').map((entry) => entry.saidOn)).toEqual([
      '2020-01-05',
      '2021-03-02',
    ]);
  });

  it('fails loudly on an unreadable or impossible date', () => {
    expect(() => parseGoogleSitesPage(dated('Someday'), 'modern')).toThrow(/date/i);
    expect(() => parseGoogleSitesPage(dated('February 30, 2024'), 'modern')).toThrow(/calendar/);
  });

  it('accepts bold, strong and em tags as well as inline styles', () => {
    const html = dated('May 1, 2020', '<p><b>Pat:</b> <em>Hello there.</em></p>');
    expect(parseGoogleSitesPage(html, 'modern')[0]?.lines).toEqual([
      { speakerLabel: 'Pat', text: 'Hello there.', kind: 'line' },
    ]);
  });

  it('finds the colon in its own bold span', () => {
    const html = dated('May 1, 2020', `<p>${bold('Pat')}${bold(': ')}${italic('Hi.')}</p>`);
    expect(parseGoogleSitesPage(html, 'modern')[0]?.lines[0]?.speakerLabel).toBe('Pat');
  });

  it('drops empty paragraphs', () => {
    const html = dated('May 1, 2020', `<p>${bold('&nbsp;')}</p><p> </p>`);
    expect(parseGoogleSitesPage(html, 'modern')[0]?.lines).toEqual([]);
  });
});

describe('college pages', () => {
  const college = parseGoogleSitesPage(fixture('college.sample.html'), 'college');

  it('treats each content section as one undated entry and skips the header', () => {
    expect(college).toHaveLength(3);
    expect(college.every((entry) => entry.saidOn === null)).toBe(true);
  });

  it('handles a bold quote mark that is not a speaker, then a real speaker after a break', () => {
    expect(college[1]?.lines).toEqual([
      { speakerLabel: null, text: '"I will punch a ghost', kind: 'line' },
      { speakerLabel: 'Test Aaron', text: 'Do not.', kind: 'line' },
    ]);
  });

  it('joins several paragraphs and narration in one entry', () => {
    expect(college[2]?.lines.map((line) => line.kind)).toEqual(['context', 'line', 'line']);
  });
});

describe('parseImages', () => {
  it('lists image sources on a memes page with their section index', () => {
    expect(parseImages(fixture('memes.sample.html'))).toEqual([
      { sectionIndex: 1, src: './memes.sample_files/meme.png' },
    ]);
  });
});

describe('isGroupLabel', () => {
  it.each([
    'Seth, Markoff, and Staub (in unison)',
    'Everyone else',
    'Pat & Jo',
    'Pat and Jo',
    'Both',
  ])('treats "%s" as a group', (label) => {
    expect(isGroupLabel(label)).toBe(true);
  });

  it.each(['Arob', 'KFed', 'Mary Jo', 'Anderson'])('treats "%s" as one person', (label) => {
    expect(isGroupLabel(label)).toBe(false);
  });
});
