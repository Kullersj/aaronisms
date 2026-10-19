import { z } from 'zod';

export const entryStatusSchema = z.enum(['pending', 'published', 'rejected']);
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
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  lines: z.array(entryLineSchema),
});

export type EntryStatus = z.infer<typeof entryStatusSchema>;
export type EntryEra = z.infer<typeof entryEraSchema>;
export type LineKind = z.infer<typeof lineKindSchema>;
export type Speaker = z.infer<typeof speakerSchema>;
export type EntryLine = z.infer<typeof entryLineSchema>;
export type Entry = z.infer<typeof entrySchema>;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const todayUtc = () => new Date().toISOString().slice(0, 10);

export const newSubmissionLineSchema = z
  .object({
    speaker: z.string().trim().min(1).max(60).nullable(),
    text: z.string().trim().min(1, 'Say something').max(1000),
    kind: lineKindSchema.default('line'),
  })
  .refine((line) => line.kind !== 'line' || line.speaker !== null, {
    message: 'Spoken lines need a speaker',
    path: ['speaker'],
  });

export const newSubmissionSchema = z.object({
  saidOn: z.iso.date().default(todayUtc),
  context: z.string().trim().max(200).optional(),
  lines: z.array(newSubmissionLineSchema).min(1, 'Add at least one line').max(30),
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

export type NewSubmissionLine = z.infer<typeof newSubmissionLineSchema>;
/** Validated submission, with defaults applied. */
export type NewSubmission = z.infer<typeof newSubmissionSchema>;
/** What a form may send before defaults are applied. */
export type NewSubmissionInput = z.input<typeof newSubmissionSchema>;
