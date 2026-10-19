import type { ReactNode } from 'react';
import { PageShell } from '@/components/layout/PageShell';

export default function ModerateLayout({ children }: { children: ReactNode }) {
  return <PageShell title="Review a submission">{children}</PageShell>;
}
