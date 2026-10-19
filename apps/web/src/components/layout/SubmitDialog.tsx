'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@aaronisms/ui/dialog';

/** Shows the submit form over the current page; closing it goes back to that page. */
export function SubmitDialog({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Submit an Aaronism</DialogTitle>
        <DialogDescription>
          Add something that was said. It is reviewed by a moderator before it appears.
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
