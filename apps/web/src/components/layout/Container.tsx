import type { ComponentProps } from 'react';
import { cn } from '@aaronisms/ui/lib/utils';

export type ContainerProps = ComponentProps<'div'>;

export function Container({ className, ...props }: ContainerProps) {
  return <div className={cn('mx-auto w-full max-w-3xl px-4', className)} {...props} />;
}
