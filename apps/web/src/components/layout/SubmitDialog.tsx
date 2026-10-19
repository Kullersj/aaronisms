'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@aaronisms/ui/dialog';

type SubmitDialogControls = {
  /** Closes the dialog and goes back to the page under it; safe to call more than once. */
  close: () => void;
  /** Tells the dialog whether the form holds something worth confirming before it is dropped. */
  setDirty: (dirty: boolean) => void;
};

const SubmitDialogContext = createContext<SubmitDialogControls | null>(null);

/** The controls of the surrounding submit dialog, or null when the form is on its own page. */
export function useSubmitDialog() {
  return useContext(SubmitDialogContext);
}

/** Shows the submit form over the current page; closing it goes back to that page. */
export function SubmitDialog({ children }: { children: ReactNode }) {
  const router = useRouter();
  const closing = useRef(false);
  const dirty = useRef(false);

  const close = useCallback(() => {
    // Each call to back() would pop another history entry, and could leave the site.
    if (closing.current) return;
    closing.current = true;
    router.back();
  }, [router]);

  const controls = useMemo(
    () => ({
      close,
      setDirty: (value: boolean) => {
        dirty.current = value;
      },
    }),
    [close],
  );

  return (
    <SubmitDialogContext.Provider value={controls}>
      <Dialog
        open
        onOpenChange={(open) => {
          if (open) return;
          if (dirty.current && !window.confirm('Discard this Aaronism?')) return;
          close();
        }}
      >
        {/* A stray click outside must not throw away a half-filled form. */}
        <DialogContent className="max-w-xl" onInteractOutside={(event) => event.preventDefault()}>
          <DialogTitle>Submit an Aaronism</DialogTitle>
          <DialogDescription>
            Add something that was said. It is reviewed by a moderator before it appears.
          </DialogDescription>
          {children}
        </DialogContent>
      </Dialog>
    </SubmitDialogContext.Provider>
  );
}
