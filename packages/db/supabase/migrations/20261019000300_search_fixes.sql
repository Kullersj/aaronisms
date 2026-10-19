-- search_entries fixes: cap the input, keep `-negated` words out of the fuzzy fallback, and only
-- use the fuzzy fallback for queries of at least four characters (shorter ones match nearly everything).
create or replace function public.search_entries(q text)
returns table (
  id uuid,
  slug text,
  said_on date,
  era public.entry_era,
  image_path text,
  image_alt text,
  published_at timestamptz,
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select left(q, 200) as q
  ),
  query as (
    select
      websearch_to_tsquery('simple', input.q) as tsq,
      -- The words that are not `-negated`, and a tsquery matching any of the negated ones.
      btrim(replace(regexp_replace(input.q, '(^|\s)-\S+', '\1', 'g'), '"', ' ')) as plain,
      (
        select websearch_to_tsquery('simple', string_agg(m[1], ' or '))
        from regexp_matches(input.q, '(?:^|\s)-([^\s-]\S*)', 'g') as m
      ) as negated
    from input
  )
  select
    e.id, e.slug, e.said_on, e.era, e.image_path, e.image_alt, e.published_at,
    (ts_rank(e.search, query.tsq) + extensions.word_similarity(query.plain, body.text))::real as rank
  from public.entries e
  cross join query
  cross join lateral (
    select string_agg(concat_ws(' ', s.name, l.speaker_label, l.text), ' ' order by l.position) as text
    from public.entry_lines l
    left join public.speakers s on s.id = l.speaker_id
    where l.entry_id = e.id
  ) body
  where e.status = 'published'
    and btrim(q) <> ''
    and (
      e.search @@ query.tsq
      or (
        length(query.plain) >= 4
        and extensions.word_similarity(query.plain, body.text) > 0.4
        and (query.negated is null or not e.search @@ query.negated)
      )
    )
  order by rank desc, e.said_on desc nulls last, e.slug;
$$;
