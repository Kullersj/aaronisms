'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@aaronisms/ui/input';
import { cn } from '@aaronisms/ui/lib/utils';
import { searchHref } from '../utils';

const DEBOUNCE_MS = 300;

export type SearchBoxProps = { className?: string };

/**
 * A plain GET form to `/search`, so it works without JavaScript. With JavaScript, submitting
 * navigates in-app, and while already on the results page typing updates them after a pause.
 * A new query drops the speaker filter, since the speakers offered depend on the results.
 */
export function SearchBox({ className }: SearchBoxProps) {
  // useSearchParams needs a Suspense boundary; the fallback is the same working form.
  return (
    <Suspense fallback={<SearchForm className={className} />}>
      <LiveSearchForm className={className} />
    </Suspense>
  );
}

function LiveSearchForm({ className }: SearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onResults = pathname === '/search';
  const urlQuery = onResults ? (params.get('q') ?? '') : '';

  const [value, setValue] = useState(urlQuery);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Queries we navigated to whose URL has not come back yet, oldest first.
  const pending = useRef<string[]>([]);
  const settled = useRef(urlQuery);

  // Follow the address bar (back button, a link), but not the echo of our own updates: a slow
  // earlier navigation can commit after a newer one and must not reset what is being typed.
  useEffect(() => {
    settled.current = urlQuery;
    const index = pending.current.lastIndexOf(urlQuery);
    if (index !== -1) {
      pending.current.splice(0, index + 1);
      return;
    }
    pending.current = [];
    setValue(urlQuery);
  }, [urlQuery]);

  // A pending update must not pull the visitor back to /search after they left it.
  useEffect(() => () => clearTimeout(timer.current), [pathname]);

  function onChange(next: string) {
    setValue(next);
    if (!onResults) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const query = next.trim();
      if (query === (pending.current.at(-1) ?? settled.current)) return;
      pending.current.push(query);
      router.replace(searchHref(query));
    }, DEBOUNCE_MS);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearTimeout(timer.current);
    const target = searchHref(value.trim());
    const search = params.toString();
    if (target === `${pathname}${search ? `?${search}` : ''}`) {
      // Already here (the URL does not change, so there is no echo to wait for).
      pending.current = [];
      router.replace(target);
      return;
    }
    pending.current.push(value.trim());
    router.push(target);
  }

  return <SearchForm className={className} value={value} onChange={onChange} onSubmit={onSubmit} />;
}

type SearchFormProps = {
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
};

function SearchForm({ className, value, onChange, onSubmit }: SearchFormProps) {
  return (
    <form
      action="/search"
      method="get"
      role="search"
      onSubmit={onSubmit}
      className={cn('relative flex items-center', className)}
    >
      <label htmlFor="site-search" className="sr-only">
        Search Aaronisms
      </label>
      <Input
        id="site-search"
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={200}
        placeholder="Search"
        {...(onChange
          ? { value: value ?? '', onChange: (event) => onChange(event.target.value) }
          : {})}
        className="h-9 [appearance:textfield] border-white/25 bg-white/10 pr-10 text-white placeholder:text-white/60 focus-visible:ring-white/60 [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-0 flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
      >
        <Search className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
