import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';

export const fieldClassName =
  'border-border bg-background placeholder:text-muted-foreground focus-visible:ring-ring aria-invalid:border-red-500 w-full rounded-md border px-3 text-base focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldClassName, 'h-10', className)} {...props} />;
}
