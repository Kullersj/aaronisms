-- Speaker points: a score for each speaker from published entries only.
--   10 per entry they speak in, 1 per line they say, and 25 per entry they submitted under their
--   own name (the submitter's name slugs to the speaker's slug). Pending, rejected and deleted
--   entries never count.
-- submitted_by is private, so this is a security definer function that returns only per-speaker
-- totals, never which entry anyone submitted.
create extension if not exists unaccent with schema extensions;

create function public.speaker_points()
returns table (
  speaker_id uuid,
  entry_count int,
  line_count int,
  submitted_count int,
  points int
)
language sql stable security definer set search_path = '' as $$
  with published as (
    select id, submitted_by from public.entries where status = 'published'
  ),
  spoken as (
    select l.speaker_id, count(distinct l.entry_id)::int as entry_count, count(*)::int as line_count
    from public.entry_lines l
    join published e on e.id = l.entry_id
    where l.kind = 'line' and l.speaker_id is not null
    group by l.speaker_id
  ),
  submitted as (
    -- Same rules as slugForSpeaker in packages/db/src/slug.ts.
    select s.id as speaker_id, count(*)::int as submitted_count
    from published e
    join public.speakers s on s.slug = trim(both '-' from regexp_replace(
      lower(extensions.unaccent('extensions.unaccent', e.submitted_by)), '[^a-z0-9]+', '-', 'g'
    ))
    group by s.id
  )
  select
    coalesce(sp.speaker_id, su.speaker_id),
    coalesce(sp.entry_count, 0),
    coalesce(sp.line_count, 0),
    coalesce(su.submitted_count, 0),
    10 * coalesce(sp.entry_count, 0) + coalesce(sp.line_count, 0) + 25 * coalesce(su.submitted_count, 0)
  from spoken sp
  full join submitted su on su.speaker_id = sp.speaker_id;
$$;

-- Supabase grants execute on new functions to every API role; say so explicitly for the public one.
grant execute on function public.speaker_points() to anon, authenticated;
