'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { Button } from '@aaronisms/ui/button';

export type CopyLinkButtonProps = {
  /** Site-relative path to copy, such as `/a/2026-01-05-1`. */
  path: string;
};

type Status = 'idle' | 'copied' | 'failed';

export function CopyLinkButton({ path }: CopyLinkButtonProps) {
  const [status, setStatus] = useState<Status>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    // Restart the timer so a second click keeps its message for the full time.
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus('idle'), 2500);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {status === 'copied' ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Link2 className="size-4" aria-hidden="true" />
        )}
        Copy link
      </Button>
      <span role="status" className="text-muted-foreground text-sm">
        {status === 'copied' ? 'Link copied' : status === 'failed' ? 'Could not copy' : ''}
      </span>
    </>
  );
}
