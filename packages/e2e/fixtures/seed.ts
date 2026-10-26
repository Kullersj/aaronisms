/**
 * Facts from packages/db/supabase/seed.sql that the public specs rely on. Everything here is made
 * up. If the seed changes, this is the one file to update.
 */
export const SEED = {
  published: {
    sandwich: {
      slug: '2026-01-05-1',
      date: 'January 5, 2026',
      text: 'I would never eat a sandwich that has been to a party.',
    },
    pumpkin: {
      slug: '2026-01-05-2',
      date: 'January 5, 2026',
      setup: 'Looking at a very large pumpkin:',
      text: 'That is just a regular pumpkin that works out.',
      reply: 'It is mostly a gourd, Test.',
      stage: 'Everyone nods slowly.',
      group: 'Everyone else (in unison):',
    },
    lighthouse: {
      slug: '2026-02-14-1',
      date: 'February 14, 2026',
      text: 'The lighthouse is closed on Tuesdays',
    },
    bicycle: { slug: 'college-1', text: 'A bicycle is just a horse' },
  },
  /** Not visible anywhere on the site. */
  hidden: {
    pending: {
      slug: '2026-03-01-1',
      text: 'Pending quote about a very patient toaster.',
      word: 'toaster',
    },
    rejected: {
      slug: '2026-03-02-1',
      text: 'Rejected quote about an unremarkable spoon.',
      word: 'spoon',
    },
  },
  /** Slugs of every published entry. */
  publishedSlugs: ['2026-01-05-1', '2026-01-05-2', '2026-02-14-1', 'college-1'],
  speakers: {
    // Points: 10 per Aaronism, 1 per line, 5 per last word. The pumpkin's last word is "Everyone
    // else", who is not a speaker.
    testAaron: { name: 'Test Aaron', slug: 'test-aaron', lines: 3, aaronisms: 3, points: 43 },
    pat: { name: 'Pat Example', slug: 'pat-example', lines: 1, points: 11 },
    sam: { name: 'Sam Sample', slug: 'sam-sample', lines: 1, points: 16 },
  },
  meme: { caption: 'A made-up meme caption' },
} as const;
