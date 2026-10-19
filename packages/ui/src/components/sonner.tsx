'use client';

import type { CSSProperties } from 'react';
import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

/** Toasts styled with the theme tokens, so they follow the light/dark class on `<html>`. */
export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--card-foreground)',
          '--normal-border': 'var(--border)',
        } as CSSProperties
      }
      {...props}
    />
  );
}
