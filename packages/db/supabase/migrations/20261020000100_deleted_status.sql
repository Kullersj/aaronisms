-- Soft deletion, part 1: a status for deleted entries. Every public read already shows only
-- published entries, so a deleted entry disappears from the site without other changes. The value
-- is added on its own because Postgres cannot use a new enum value in the transaction that adds it.
alter type public.entry_status add value 'deleted';
