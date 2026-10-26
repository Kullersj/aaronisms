-- Speaker points: a score for each speaker from their published entries only.
--   10 per published entry they speak in, and 1 per line they say. Pending, rejected and deleted
--   entries never count.
-- security_invoker keeps the callers' RLS in force, so anon still sees only published data.
create view public.speaker_points with (security_invoker = true) as
select
  l.speaker_id,
  count(distinct l.entry_id)::int as entry_count,
  count(*)::int as line_count,
  (10 * count(distinct l.entry_id) + count(*))::int as points
from public.entry_lines l
join public.entries e on e.id = l.entry_id
where e.status = 'published' and l.kind = 'line' and l.speaker_id is not null
group by l.speaker_id;

grant select on public.speaker_points to anon, authenticated;
