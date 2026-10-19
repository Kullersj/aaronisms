import type { ReactNode } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { AdminNav } from '@/features/admin/components/AdminNav';

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <PageShell title="Admin" actions={<AdminNav />}>
      {children}
    </PageShell>
  );
}
