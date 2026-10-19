'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { entryEditSchema, type EntryEdit } from '@aaronisms/db/schemas';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { decideWithToken, type Decision } from './decisions';
import { isTokenShaped } from './tokens';

export type EditResult = { ok: false; message: string };

const MAX_NOTE_LENGTH = 500;

function pageUrl(token: string) {
  return isTokenShaped(token) ? `/moderate/${token}?done=1` : '/';
}

/** Decides, then returns to the page, which shows the result (or why nothing changed). */
async function decideAndReturn(
  token: string,
  decision: Decision,
  edit?: EntryEdit,
): Promise<never> {
  const url = pageUrl(token);
  const ip = getClientIp(await headers());
  // Over the limit: change nothing and let the page explain.
  if (await checkRateLimit(RATE_LIMITS.moderate, ip)) {
    await decideWithToken(token, decision, edit);
  }
  redirect(url);
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export async function approveByToken(formData: FormData): Promise<void> {
  return decideAndReturn(field(formData, 'token'), { kind: 'approve' });
}

export async function rejectByToken(formData: FormData): Promise<void> {
  const note = field(formData, 'note').trim().slice(0, MAX_NOTE_LENGTH);
  return decideAndReturn(field(formData, 'token'), { kind: 'reject', note: note || undefined });
}

/** Edit and approve in one transaction. Returns only on invalid input; otherwise redirects. */
export async function approveWithEdits(token: string, edit: unknown): Promise<EditResult> {
  const parsed = entryEditSchema.safeParse(edit);
  if (!parsed.success) return { ok: false, message: 'Please check the form and try again.' };
  return decideAndReturn(token, { kind: 'approve' }, parsed.data);
}
