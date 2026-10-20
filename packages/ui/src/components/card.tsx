import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';

export type CardProps = ComponentProps<'div'> & {
  /** Element to render, so a card can be an `<article>` or `<section>`. */
  as?: 'div' | 'article' | 'section';
};

export function Card({ as: Component = 'div', className, ...props }: CardProps) {
  return (
    <Component
      className={cn(
        'bg-card text-card-foreground border-border rounded-md border shadow-xs',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 px-5 pt-5 sm:px-6', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-3 px-5 py-4 sm:px-6', className)} {...props} />;
}
