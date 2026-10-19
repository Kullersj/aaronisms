import { expect } from '@playwright/test';
import { MAILPIT_URL } from './env';

type MailpitSummary = { ID: string; Created: string };

/** Waits for a Supabase sign-in email to `to` newer than `since`, and returns its link. */
export async function waitForMagicLink(to: string, since: Date): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(
          `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
        );
        const { messages } = (await search.json()) as { messages: MailpitSummary[] };
        const latest = messages.find((message) => new Date(message.Created) >= since);
        if (!latest) return undefined;
        const message = (await (
          await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`)
        ).json()) as {
          Text: string;
        };
        link = /https?:\/\/\S+\/auth\/v1\/verify\S+/.exec(message.Text)?.[0];
        return link;
      },
      { message: `no sign-in email to ${to}`, timeout: 15_000 },
    )
    .toBeTruthy();
  return link as string;
}

/**
 * How many sign-in emails Mailpit holds for an address; used to prove none were sent. Only the
 * magic-link subject counts, so moderation emails to the same address cannot disturb it.
 */
export async function countSignInEmailsTo(to: string): Promise<number> {
  const query = encodeURIComponent(`to:${to} subject:"sign-in link"`);
  const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
  return ((await search.json()) as { messages_count: number }).messages_count;
}

export type ReceivedEmail = {
  to: string;
  replyTo: string | undefined;
  subject: string;
  html: string;
};

export type ModerationLinks = { approve: string; reject: string; edit: string };

/** Waits for the moderation email sent to one address about a submission from `submitter`. */
export async function waitForEmail(to: string, submitter: string): Promise<ReceivedEmail> {
  let found: ReceivedEmail | undefined;
  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:${to} subject:"${submitter}"`);
        const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
        const { messages } = (await search.json()) as { messages: MailpitSummary[] };
        const first = messages[0];
        if (!first) return false;
        const message = (await (
          await fetch(`${MAILPIT_URL}/api/v1/message/${first.ID}`)
        ).json()) as {
          Subject: string;
          HTML: string;
          ReplyTo: { Address: string }[];
        };
        found = {
          to,
          replyTo: message.ReplyTo[0]?.Address,
          subject: message.Subject,
          html: message.HTML,
        };
        return true;
      },
      { message: `no moderation email to ${to} for ${submitter}`, timeout: 15_000 },
    )
    .toBe(true);
  return found as ReceivedEmail;
}

/** The three buttons of a moderation email, as paths on the site (the origin is dropped). */
export function moderationLinks(email: ReceivedEmail): ModerationLinks {
  const link = (action: string) => {
    const match = new RegExp(`href="([^"]*/moderate/[^"?]+\\?action=${action})"`).exec(email.html);
    if (!match?.[1]) throw new Error(`No ${action} link in the email to ${email.to}`);
    const url = new URL(match[1].replaceAll('&amp;', '&'));
    return url.pathname + url.search;
  };
  return { approve: link('approve'), reject: link('reject'), edit: link('edit') };
}
