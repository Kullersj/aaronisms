// Test helpers for Mailpit, the local Supabase stack's inbox. Shared by the db, email, web and e2e tests.

/** Where the local Supabase stack exposes Mailpit (see packages/db/supabase/config.toml). */
export const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
export const SMTP_URL = process.env.EMAIL_SMTP_URL ?? 'smtp://127.0.0.1:54325';

export type MailpitSummary = { ID: string; Created: string };

export type MailpitMessage = {
  To: { Address: string }[];
  ReplyTo: { Address: string }[];
  Subject: string;
  HTML: string;
  Text: string;
};

/** Messages matching a Mailpit search (newest first) and the total, which can exceed the first page. */
export async function searchMessages(
  query: string,
): Promise<{ messages: MailpitSummary[]; total: number }> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(query)}`);
  const body = (await response.json()) as { messages: MailpitSummary[]; messages_count: number };
  return { messages: body.messages, total: body.messages_count };
}

export async function getMessage(id: string): Promise<MailpitMessage> {
  return (await (await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)).json()) as MailpitMessage;
}

/** Finds the messages Mailpit holds for a recipient whose subject contains `subject`. */
export async function findMessages(to: string, subject: string): Promise<MailpitMessage[]> {
  const { messages } = await searchMessages(`to:${to} subject:"${subject}"`);
  return Promise.all(messages.map(({ ID }) => getMessage(ID)));
}
