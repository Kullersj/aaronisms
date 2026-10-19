export type YearNavProps = { years: number[] };

export function YearNav({ years }: YearNavProps) {
  if (years.length < 2) return null;
  return (
    <nav
      aria-label="Jump to year"
      className="max-sm:bg-muted/90 mb-2 max-sm:sticky max-sm:top-0 max-sm:z-20 max-sm:-mx-4 max-sm:mb-0 max-sm:flex max-sm:h-14 max-sm:items-center max-sm:overflow-x-auto max-sm:px-4 max-sm:backdrop-blur"
    >
      {/* Phones: one scrolling row pinned to the top; wider screens wrap as a plain list. */}
      <ul className="flex flex-wrap gap-2 max-sm:flex-nowrap">
        {years.map((year) => (
          <li key={year} className="shrink-0">
            <a
              href={`#year-${year}`}
              className="border-border bg-card hover:bg-accent focus-visible:ring-ring inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              {year}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
