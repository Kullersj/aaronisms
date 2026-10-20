/**
 * Notices an admin page shows after an action redirects back to it. The URL carries only a code
 * (`?message=speaker-renamed`), looked up here, so a crafted link cannot put its own text on the page.
 */
export const ADMIN_MESSAGES = {
  'already-decided': 'Nothing changed: that entry was already decided or no longer exists.',
  'entry-deleted': 'Entry deleted.',
  'entry-already-deleted': 'That entry was already deleted.',
  'speaker-name-invalid': 'Enter a name of up to 60 characters.',
  'speaker-missing': 'That speaker no longer exists.',
  'speaker-duplicate': 'Another speaker already has that name. Merge them instead.',
  'speaker-renamed': 'Renamed.',
  'merge-target-missing': 'Choose a different speaker to merge into.',
  'speakers-merged': 'Merged.',
} as const;

export type AdminMessageCode = keyof typeof ADMIN_MESSAGES;

/** `path` with the message code in its query string. */
export function adminMessageUrl(path: string, code: AdminMessageCode): string {
  return `${path}?message=${code}`;
}

/** The text for a `?message=` value, or undefined when it is not a known code. */
export function adminMessage(code: string | string[] | undefined): string | undefined {
  const value = Array.isArray(code) ? code[0] : code;
  return value && Object.hasOwn(ADMIN_MESSAGES, value)
    ? ADMIN_MESSAGES[value as AdminMessageCode]
    : undefined;
}
