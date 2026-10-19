import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';
import { fieldClassName } from './input';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClassName, 'min-h-20 py-2', className)} {...props} />;
}
