import { Body, Container, Head, Heading, Html, Text } from '@react-email/components';

export type AlertEmailProps = {
  title: string;
  details: string;
};

/** A plain operational alert for the default moderator, such as a failed email send. */
export function AlertEmail({ title, details }: AlertEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#171717' }}>
        <Container style={{ maxWidth: '560px', padding: '24px 16px' }}>
          <Heading as="h1" style={{ fontSize: '20px', fontWeight: 500 }}>
            {title}
          </Heading>
          <Text style={{ fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {details}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

AlertEmail.PreviewProps = {
  title: 'Moderation email failed',
  details: 'Could not email friend@example.com about 2026-10-18-1.',
} satisfies AlertEmailProps;

// React Email's preview server needs a default export.
export default AlertEmail;
