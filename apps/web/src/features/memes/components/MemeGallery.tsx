'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@aaronisms/ui/dialog';

export type MemeGalleryItem = { id: string; src: string; caption: string | null };

export type MemeGalleryProps = { items: MemeGalleryItem[] };

export function MemeGallery({ items }: MemeGalleryProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const active = items.find((item) => item.id === activeId);

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={(event) => {
                opener.current = event.currentTarget;
                setActiveId(item.id);
              }}
              aria-label={`View meme${item.caption ? `: ${item.caption}` : ''}`}
              className="border-border bg-card focus-visible:ring-ring block w-full overflow-hidden rounded-md border focus-visible:ring-2 focus-visible:outline-none"
            >
              <Image
                src={item.src}
                alt={item.caption ?? 'Meme'}
                width={600}
                height={600}
                sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw"
                className="aspect-square w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={active !== undefined} onOpenChange={(open) => !open && setActiveId(null)}>
        {active ? (
          <DialogContent
            onCloseAutoFocus={(event) => {
              // The grid button is not a DialogTrigger, so return focus to it by hand.
              event.preventDefault();
              opener.current?.focus();
            }}
          >
            <DialogTitle>{active.caption ?? 'Meme'}</DialogTitle>
            <DialogDescription className="sr-only">Enlarged meme image</DialogDescription>
            <Image
              src={active.src}
              alt={active.caption ?? 'Meme'}
              width={1600}
              height={1200}
              sizes="(min-width: 896px) 860px, 100vw"
              className="mx-auto h-auto max-h-[75vh] w-auto max-w-full object-contain"
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
