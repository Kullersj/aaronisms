import Link from 'next/link';
import { Shuffle } from 'lucide-react';
import { buttonVariants } from '@aaronisms/ui/button';
import { cn } from '@aaronisms/ui/lib/utils';
import { SearchBox } from '@/features/search/components/SearchBox';
import { Container } from './Container';
import { SiteNav, type NavItem } from './SiteNav';
import { SubmitLink } from './SubmitLink';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/speakers', label: 'Speakers' },
  { href: '/college', label: 'College Years' },
  { href: '/memes', label: 'Memes' },
];

export function SiteHeader() {
  return (
    <header className="relative overflow-hidden bg-neutral-900 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 size-64 rotate-12 bg-neutral-800" />
        <div className="absolute top-10 right-[12%] size-40 rounded-full bg-neutral-800/80" />
        <div className="absolute -right-10 -bottom-16 size-56 -rotate-12 bg-neutral-700/40" />
        <div className="absolute bottom-0 left-[38%] h-24 w-24 rotate-45 bg-neutral-700/30" />
      </div>
      <Container className="relative max-w-5xl py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <SiteNav items={NAV_ITEMS} />
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox className="w-36 sm:w-48" />
            {/*
              A plain anchor, not <Link>: the client router remembers where /random redirected
              the first time and replays it, so later presses never reach the server. The lint
              rule mistakes /random for a page because the @modal catch-all matches every path.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/random"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'text-white hover:bg-white/10 hover:text-white',
              )}
            >
              <Shuffle className="size-4" aria-hidden="true" />
              Random
            </a>
            <ThemeToggle />
            <SubmitLink />
          </div>
        </div>
        <div className="py-10 text-center sm:py-14">
          <Link
            href="/"
            className="focus-visible:ring-ring rounded-sm text-5xl font-thin tracking-tight focus-visible:ring-2 focus-visible:outline-none sm:text-7xl"
          >
            Aaronisms
          </Link>
          <p className="mt-2 text-base text-white/70 sm:text-lg">Peruse at risk</p>
        </div>
      </Container>
    </header>
  );
}
