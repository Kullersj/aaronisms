/** A text field from a submitted form; empty when it is missing or is a file. */
export function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

/** The JSON in a form field (how the client forms send their fields), or null when it is not valid JSON. */
export function jsonField(formData: FormData, name = 'payload'): unknown {
  const value = formData.get(name);
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Longest reason a moderator can give when rejecting. */
export const MAX_NOTE_LENGTH = 500;

/** The rejection note from a decision form, trimmed and capped. */
export function noteField(formData: FormData): string {
  return field(formData, 'note').trim().slice(0, MAX_NOTE_LENGTH);
}
