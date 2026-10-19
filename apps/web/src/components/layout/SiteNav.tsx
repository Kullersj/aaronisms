'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string };

export type SiteNavProps = { items: NavItem[] };

export function SiteNav({ items }: SiteNavProps) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className="focus-visible:ring-ring rounded-sm py-1 text-sm text-white/70 underline-offset-8 hover:text-white focus-visible:ring-2 focus-visible:outline-none aria-[current=page]:text-white aria-[current=page]:underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
