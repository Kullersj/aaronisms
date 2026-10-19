import type { Metadata } from 'next';
import { NotFoundMessage } from '@/components/layout/NotFoundMessage';

export const metadata: Metadata = { title: 'Not found' };

export default function NotFound() {
  return <NotFoundMessage />;
}
