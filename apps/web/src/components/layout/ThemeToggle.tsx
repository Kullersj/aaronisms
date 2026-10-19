'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@aaronisms/ui/button';
import { THEME_STORAGE_KEY } from '@/lib/theme';

export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      // Storage can be blocked; the toggle still works for this page view.
    }
  }

  // Both icons are always rendered and switched with CSS, so server and client markup match.
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="w-9 px-0 text-white hover:bg-white/10 hover:text-white"
    >
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
    </Button>
  );
}
