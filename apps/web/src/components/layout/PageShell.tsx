import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from './Container';

export type PageShellProps = {
  title: string;
  /** Extra controls on the right of the header, such as navigation. */
  actions?: ReactNode;
  children: ReactNode;
};

/** A plain frame for the pages moderators use, without the public site's banner. */
export function PageShell({ title, actions, children }: PageShellProps) {
  return (
    <div className="bg-muted min-h-screen">
      <header className="border-border bg-background border-b">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Link href="/" className="text-xl font-thin tracking-tight">
            Aaronisms
          </Link>
          {actions}
        </Container>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-light tracking-tight">{title}</h1>
        {children}
      </main>
    </div>
  );
}
