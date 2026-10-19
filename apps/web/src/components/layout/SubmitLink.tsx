'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buttonVariants } from '@aaronisms/ui/button';
import { cn } from '@aaronisms/ui/lib/utils';

/** The header's way in to the submit form; on the form's own page it just focuses the form. */
export function SubmitLink() {
  const pathname = usePathname();
  return (
    <Link
      href="/submit"
      onClick={(event) => {
        // Already on /submit the URL would not change, so the dialog could not be closed again.
        if (pathname !== '/submit') return;
        event.preventDefault();
        document.getElementById('saidOn')?.focus();
      }}
      className={cn(buttonVariants({ size: 'sm' }), 'bg-white text-neutral-900 hover:bg-white/90')}
    >
      Submit an Aaronism
    </Link>
  );
}
