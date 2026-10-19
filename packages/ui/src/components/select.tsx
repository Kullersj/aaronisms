import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';
import { fieldClassName } from './input';

/** A styled native `<select>`: accessible and touch-friendly without extra dependencies. */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(fieldClassName, 'h-10', className)} {...props} />;
}
