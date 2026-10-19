/** Where the local Supabase stack exposes Mailpit (see packages/db/supabase/config.toml). */
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

export type MailpitMessage = {
  To: { Address: string }[];
  ReplyTo: { Address: string }[];
  Subject: string;
  HTML: string;
};

/** The messages Mailpit holds for a recipient whose subject contains `subject`. */
export async function findMessages(to: string, subject: string): Promise<MailpitMessage[]> {
  const query = encodeURIComponent(`to:${to} subject:"${subject}"`);
  const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
  const { messages } = (await search.json()) as { messages: { ID: string }[] };
  return Promise.all(
    messages.map(
      async ({ ID }) =>
        (await (await fetch(`${MAILPIT_URL}/api/v1/message/${ID}`)).json()) as MailpitMessage,
    ),
  );
}
