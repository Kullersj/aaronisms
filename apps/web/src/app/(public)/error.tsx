'use client';

import { useEffect } from 'react';
import { Button } from '@aaronisms/ui/button';
import { Container } from '@/components/layout/Container';

export default function PublicError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-16 text-center">
      <h1 className="text-3xl font-light tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground mt-2">
        The Aaronisms could not be loaded right now. Please try again in a moment.
      </p>
      <Button type="button" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </Container>
  );
}
