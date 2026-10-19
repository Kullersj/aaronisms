export type YearNavProps = { years: number[] };

export function YearNav({ years }: YearNavProps) {
  if (years.length < 2) return null;
  return (
    <nav aria-label="Jump to year" className="mb-2">
      <ul className="flex flex-wrap gap-2">
        {years.map((year) => (
          <li key={year}>
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
