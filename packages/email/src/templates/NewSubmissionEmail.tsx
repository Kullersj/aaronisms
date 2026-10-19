import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export type EmailLine = {
  kind: 'line' | 'stage' | 'context';
  /** Speaker name or group label; null for stage directions and setup lines. */
  speaker: string | null;
  text: string;
};

export type NewSubmissionEmailProps = {
  /** Free-text name from the form; null when the submitter left it blank. */
  submitterName: string | null;
  /** Human-readable date such as "October 18, 2026". */
  dateLabel: string;
  lines: EmailLine[];
  /** Public URL of the attached photo, if any. */
  imageUrl: string | null;
  approveUrl: string;
  rejectUrl: string;
  editUrl: string;
};

export function newSubmissionSubject(submitterName: string | null): string {
  return `New Aaronism submitted by ${submitterName ?? 'Anonymous'}`;
}

function bracketed(text: string): string {
  const trimmed = text.trim();
  return trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed : `[${trimmed}]`;
}

function QuoteLine({ line }: { line: EmailLine }) {
  if (line.kind === 'stage') {
    return (
      <Text style={{ ...text, color: '#737373', fontStyle: 'italic' }}>{bracketed(line.text)}</Text>
    );
  }
  if (line.kind === 'context' || !line.speaker) {
    return <Text style={text}>{line.text}</Text>;
  }
  return (
    <Text style={text}>
      <strong>{`${line.speaker}:`}</strong> <em>{line.text}</em>
    </Text>
  );
}

export function NewSubmissionEmail({
  submitterName,
  dateLabel,
  lines,
  imageUrl,
  approveUrl,
  rejectUrl,
  editUrl,
}: NewSubmissionEmailProps) {
  const subject = newSubmissionSubject(submitterName);
  return (
    <Html lang="en">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={eyebrow}>{subject}</Text>
          <Section style={card}>
            <Heading as="h1" style={heading}>
              {dateLabel}
            </Heading>
            {lines.map((line, index) => (
              <QuoteLine key={index} line={line} />
            ))}
            {imageUrl ? <Img src={imageUrl} alt="" width="496" style={image} /> : null}
          </Section>
          <Section style={actions}>
            <Button
              href={approveUrl}
              style={{ ...button, backgroundColor: '#171717', color: '#fafafa' }}
            >
              Approve
            </Button>
            <Button
              href={rejectUrl}
              style={{ ...button, backgroundColor: '#e5e5e5', color: '#171717' }}
            >
              Reject
            </Button>
            <Button
              href={editUrl}
              style={{ ...button, border: '1px solid #d4d4d4', color: '#171717' }}
            >
              Edit before approving
            </Button>
          </Section>
          <Text style={footer}>
            The buttons open a confirmation page; nothing changes until you confirm there. The first
            decision wins, so if someone else already decided you will see that instead.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

NewSubmissionEmail.PreviewProps = {
  submitterName: 'Pat',
  dateLabel: 'October 18, 2026',
  lines: [
    { kind: 'context', speaker: null, text: 'Looking at a very large pumpkin:' },
    { kind: 'line', speaker: 'Test Aaron', text: 'That is just a regular pumpkin that works out.' },
    { kind: 'line', speaker: 'Pat Example', text: 'It is mostly a gourd, Test.' },
    { kind: 'stage', speaker: null, text: 'Everyone nods slowly.' },
  ],
  imageUrl: null,
  approveUrl: 'http://localhost:3000/moderate/preview-token?action=approve',
  rejectUrl: 'http://localhost:3000/moderate/preview-token?action=reject',
  editUrl: 'http://localhost:3000/moderate/preview-token?action=edit',
} satisfies NewSubmissionEmailProps;

// React Email's preview server needs a default export.
export default NewSubmissionEmail;

const font = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const body = { backgroundColor: '#f5f5f5', fontFamily: font, margin: 0, padding: '24px 0' };
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' };
const eyebrow = { fontSize: '14px', color: '#525252', margin: '0 0 12px' };
const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e5e5',
  borderRadius: '6px',
  padding: '20px 24px',
};
const heading = { fontSize: '28px', fontWeight: 300, margin: '0 0 12px', color: '#171717' };
const text = { fontSize: '17px', lineHeight: '1.6', margin: '0 0 8px', color: '#171717' };
const image = {
  borderRadius: '6px',
  border: '1px solid #e5e5e5',
  maxWidth: '100%',
  height: 'auto',
};
const actions = { padding: '20px 0 8px' };
const button = {
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
  padding: '10px 16px',
  marginRight: '8px',
  marginBottom: '8px',
  display: 'inline-block',
};
const footer = { fontSize: '12px', color: '#737373', lineHeight: '1.5' };
