import { render } from '@react-email/components';
import { createTransport } from 'nodemailer';
import { Resend } from 'resend';
import type { ReactElement } from 'react';

export type EmailConfig =
  /** Production: send through Resend. */
  | { transport: 'resend'; apiKey: string; from: string }
  /** Development and tests: send over SMTP to the local stack's Mailpit, which captures it. */
  | { transport: 'smtp'; url: string; from: string };

export type EmailMessage = {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
};

/** Sends one email through the configured transport. Throws if it could not be sent. */
export async function sendEmail(config: EmailConfig, message: EmailMessage): Promise<void> {
  const [html, text] = await Promise.all([
    render(message.react),
    render(message.react, { plainText: true }),
  ]);
  const email = {
    from: config.from,
    to: message.to,
    replyTo: message.replyTo,
    subject: message.subject,
    html,
    text,
  };

  if (config.transport === 'smtp') {
    await createTransport(config.url).sendMail(email);
    return;
  }
  const { error } = await new Resend(config.apiKey).emails.send(email);
  if (error) throw new Error(`Resend rejected the email: ${error.message}`);
}
