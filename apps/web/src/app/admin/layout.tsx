import type { ReactNode } from 'react';

// Every admin page reads the signed-in user's cookies at request time.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
