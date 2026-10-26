import { z } from 'zod';

export const entryStatusSchema = z.enum(['pending', 'published', 'rejected', 'deleted']);
export const entryEraSchema = z.enum(['modern', 'college']);
export const lineKindSchema = z.enum(['line', 'stage', 'context']);

export const speakerSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const entryLineSchema = z.object({
  id: z.uuid(),
  position: z.number().int().min(1),
  kind: lineKindSchema,
  /** Known speaker, or null for stage/context lines and unrecognised speakers. */
  speaker: speakerSchema.nullable(),
  /** Raw label for group lines such as "Everyone else"; used when there is no `speaker`. */
  speakerLabel: z.string().nullable(),
  text: z.string().min(1),
});

export const entrySchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  /** ISO date (YYYY-MM-DD); null for undated College Years entries. */
  saidOn: z.iso.date().nullable(),
  era: entryEraSchema,
  status: entryStatusSchema,
  imagePath: z.string().nullable(),
  imageAlt: z.string().nullable(),
  /** True when the share card and link preview must not quote the entry. */
  noPreview: z.boolean(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  lines: z.array(entryLineSchema),
});

export const memeSchema = z.object({
  id: z.uuid(),
  imagePath: z.string().min(1),
  caption: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});

export type EntryStatus = z.infer<typeof entryStatusSchema>;
export type EntryEra = z.infer<typeof entryEraSchema>;
export type LineKind = z.infer<typeof lineKindSchema>;
export type Speaker = z.infer<typeof speakerSchema>;
export type EntryLine = z.infer<typeof entryLineSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type Meme = z.infer<typeof memeSchema>;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Hidden spam-trap field of the submit form. Its name means nothing, so bots cannot guess to skip it. */
export const HONEYPOT_FIELD = 'q7x_f2k';

const todayUtc = () => new Date().toISOString().slice(0, 10);
/** Allows one day past UTC today, so a visitor ahead of UTC can still submit their own today. */
const tomorrowUtc = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const EARLIEST_SAID_ON = '1990-01-01';

export const newSubmissionLineSchema = z
  .object({
    speaker: z.string().trim().min(1, 'Who said it?').max(60).nullable(),
    text: z.string().trim().min(1, 'Say something').max(1000),
    kind: lineKindSchema.default('line'),
  })
  .refine((line) => line.kind !== 'line' || line.speaker !== null, {
    message: 'Spoken lines need a speaker',
    path: ['speaker'],
  });

const contextSchema = z.string().trim().max(200).optional();
const linesSchema = z.array(newSubmissionLineSchema).min(1, 'Add at least one line').max(30);

export const newSubmissionSchema = z.object({
  saidOn: z.iso
    .date()
    .refine((date) => date >= EARLIEST_SAID_ON && date <= tomorrowUtc(), 'Pick a recent date')
    .default(todayUtc),
  context: contextSchema,
  lines: linesSchema,
  submittedBy: z.string().trim().max(80).optional(),
  image: z.preprocess(
    // A file input left empty still submits a zero-byte File.
    (value) => (value instanceof File && value.size === 0 ? undefined : value),
    z
      .instanceof(File)
      .refine((file) => file.size <= MAX_IMAGE_BYTES, 'Image must be 5 MB or smaller')
      .refine((file) => IMAGE_TYPES.includes(file.type), 'Image must be a JPEG, PNG, WebP or GIF')
      .optional(),
  ),
});

/**
 * A line of an existing entry. Looser than a submission line so imported data survives a save:
 * long text, spoken lines with no speaker, setup lines and group labels (a `speakerLabel` that
 * `speaker` still repeats stays a label instead of becoming a speaker).
 */
export const entryEditLineSchema = z.object({
  speaker: z.string().trim().min(1, 'Who said it?').max(200).nullable(),
  speakerLabel: z.string().max(200).nullable().optional(),
  text: z.string().trim().min(1, 'Say something').max(10_000),
  kind: lineKindSchema.default('line'),
});

/** An edit to an existing entry: the date (null for undated College Years entries), setup line and lines. */
export const entryEditSchema = z.object({
  saidOn: z.iso.date().nullable(),
  context: z.string().trim().max(2000).optional(),
  lines: z.array(entryEditLineSchema).min(1, 'Add at least one line').max(500),
});

export type NewSubmissionLine = z.infer<typeof newSubmissionLineSchema>;
export type EntryEditLine = z.infer<typeof entryEditLineSchema>;
export type EntryEdit = z.infer<typeof entryEditSchema>;
/** Validated submission, with defaults applied. */
export type NewSubmission = z.infer<typeof newSubmissionSchema>;
/** What a form may send before defaults are applied. */
export type NewSubmissionInput = z.input<typeof newSubmissionSchema>;
