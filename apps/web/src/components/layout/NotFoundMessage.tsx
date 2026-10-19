import Link from 'next/link';
import { Container } from './Container';

export function NotFoundMessage() {
  return (
    <Container className="py-16 text-center">
      <h1 className="text-4xl font-light tracking-tight">Not found</h1>
      <p className="text-muted-foreground mt-2">That Aaronism does not exist (yet).</p>
      <Link href="/" className="mt-6 inline-block underline underline-offset-4">
        Back to all Aaronisms
      </Link>
    </Container>
  );
}
