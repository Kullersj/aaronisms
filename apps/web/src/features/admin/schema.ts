import { z } from 'zod';
import { entryEditSchema, entryStatusSchema } from '@aaronisms/db/schemas';

/** What the admin entry form sends alongside an optional replacement photo. */
export const adminEntrySchema = z.object({
  edit: entryEditSchema,
  /** Only applied to entries that are already decided; a pending entry changes via approve. */
  status: entryStatusSchema,
  /** The status the form was loaded with; the save is refused if the entry has moved on since. */
  expectedStatus: entryStatusSchema,
  imageAlt: z.string().trim().max(300),
  removeImage: z.boolean(),
  /** For a pending entry: save the edits, or save and approve in one step. */
  intent: z.enum(['save', 'approve']),
});

export type AdminEntryInput = z.infer<typeof adminEntrySchema>;
