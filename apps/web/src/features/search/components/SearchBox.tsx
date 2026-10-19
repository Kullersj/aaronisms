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
  const lastPushed = useRef(urlQuery);

  // Follow the address bar (back button, a link) unless the change is our own debounced update.
  useEffect(() => {
    if (urlQuery !== lastPushed.current) {
      lastPushed.current = urlQuery;
      setValue(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function onChange(next: string) {
    setValue(next);
    if (!onResults) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const query = next.trim();
      lastPushed.current = query;
      router.replace(searchHref(query));
    }, DEBOUNCE_MS);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearTimeout(timer.current);
    const query = value.trim();
    lastPushed.current = query;
    router.push(searchHref(query));
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
