'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { entryEditSchema, type EntryEdit } from '@aaronisms/db/schemas';
import { field, noteField } from '@/lib/form';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { decideWithToken, type Decision, type DecisionOutcome } from './decisions';
import { isTokenShaped } from './tokens';

export type EditResult = { ok: false; message: string };

/** `done` is the outcome, so the page can tell "you decided" from "it was already decided". */
function pageUrl(token: string, outcome?: DecisionOutcome) {
  if (!isTokenShaped(token)) return '/';
  return outcome ? `/moderate/${token}?done=${outcome}` : `/moderate/${token}`;
}

/** Decides, then returns to the page, which shows the result (or why nothing changed). */
async function decideAndReturn(
  token: string,
  decision: Decision,
  edit?: EntryEdit,
): Promise<never> {
  const ip = getClientIp(await headers());
  // Over the limit: change nothing and let the page explain.
  const outcome = (await checkRateLimit(RATE_LIMITS.moderate, ip))
    ? await decideWithToken(token, decision, edit)
    : undefined;
  redirect(pageUrl(token, outcome));
}

export async function approveByToken(formData: FormData): Promise<void> {
  return decideAndReturn(field(formData, 'token'), { kind: 'approve' });
}

export async function rejectByToken(formData: FormData): Promise<void> {
  const note = noteField(formData);
  return decideAndReturn(field(formData, 'token'), { kind: 'reject', note: note || undefined });
}

/** Edit and approve in one transaction. Returns only on invalid input; otherwise redirects. */
export async function approveWithEdits(token: string, edit: unknown): Promise<EditResult> {
  const parsed = entryEditSchema.safeParse(edit);
  if (!parsed.success) return { ok: false, message: 'Please check the form and try again.' };
  return decideAndReturn(token, { kind: 'approve' }, parsed.data);
}
