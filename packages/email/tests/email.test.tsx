import { randomUUID } from 'node:crypto';
import { render } from '@react-email/components';
import { describe, expect, it } from 'vitest';
import { NewSubmissionEmail, newSubmissionSubject, sendEmail } from '../src';
import { findMessages, SMTP_URL } from './mailpit';

const props = NewSubmissionEmail.PreviewProps;

describe('NewSubmissionEmail', () => {
  it('renders the quote like the site card', async () => {
    const html = await render(<NewSubmissionEmail {...props} />);
    expect(html).toContain('October 18, 2026');
    expect(html).toContain('Looking at a very large pumpkin:');
    expect(html).toMatch(/<strong>Test Aaron:<\/strong>/);
    expect(html).toMatch(/<em>That is just a regular pumpkin that works out\.<\/em>/);
    expect(html).toContain('[Everyone nods slowly.]');
  });

  it('links the three actions to the moderation page', async () => {
    const html = await render(<NewSubmissionEmail {...props} />);
    for (const action of ['approve', 'reject', 'edit']) {
      expect(html).toContain(
        `href="http://localhost:3000/moderate/preview-token?action=${action}"`,
      );
    }
    expect(html).toContain('Edit before approving');
  });

  it('names the submitter, or says Anonymous', async () => {
    expect(await render(<NewSubmissionEmail {...props} />)).toContain('submitted by Pat');
    const anonymous = await render(<NewSubmissionEmail {...props} submitterName={null} />);
    expect(anonymous).toContain('submitted by Anonymous');
    expect(newSubmissionSubject(null)).toBe('New Aaronism submitted by Anonymous');
  });

  it('includes the photo only when there is one', async () => {
    expect(await render(<NewSubmissionEmail {...props} />)).not.toContain('<img');
    const withPhoto = await render(
      <NewSubmissionEmail {...props} imageUrl="http://example.com/photo.png" />,
    );
    expect(withPhoto).toContain('src="http://example.com/photo.png"');
  });

  it('escapes submitted text', async () => {
    const html = await render(
      <NewSubmissionEmail
        {...props}
        lines={[{ kind: 'line', speaker: 'A', text: '<script>alert(1)</script>' }]}
      />,
    );
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});

describe('sendEmail (smtp transport, through the local Mailpit)', () => {
  it('delivers the rendered email with its headers', async () => {
    const to = `${randomUUID()}@example.com`;
    await sendEmail(
      { transport: 'smtp', url: SMTP_URL, from: 'Aaronisms <noreply@example.com>' },
      {
        to,
        replyTo: 'first@example.com',
        subject: 'Hello from the test',
        react: <NewSubmissionEmail {...props} />,
      },
    );
    const [message] = await findMessages(to, 'Hello from the test');
    expect(message?.ReplyTo[0]?.Address).toBe('first@example.com');
    expect(message?.Text).toMatch(/october 18, 2026/i);
    expect(message?.HTML).toContain('?action=approve');
  });

  it('throws when the server cannot be reached', async () => {
    await expect(
      sendEmail(
        { transport: 'smtp', url: 'smtp://127.0.0.1:1', from: 'a@example.com' },
        { to: 'b@example.com', subject: 'x', react: <NewSubmissionEmail {...props} /> },
      ),
    ).rejects.toThrow();
  });
});
