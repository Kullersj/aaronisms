import { ImageResponse } from 'next/og';
import { SiteCard } from '@/features/entries/components/OgCards';

export const alt = 'Aaronisms';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The default card for every page without its own, in the header's dark style. */
export default function Image() {
  return new ImageResponse(<SiteCard />, size);
}
