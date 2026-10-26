-- Speaker points: a score for each speaker from their published entries only.
--   10 per published entry they speak in, 1 per line they say, and 5 per punchline (the last
--   spoken line of an entry). Pending, rejected and deleted entries never count.
-- security_invoker keeps the callers' RLS in force, so anon still sees only published data.
create view public.speaker_points with (security_invoker = true) as
with lines as (
  select l.entry_id, l.speaker_id, l.position,
    l.position = max(l.position) over (partition by l.entry_id) as is_punchline
  from public.entry_lines l
  join public.entries e on e.id = l.entry_id
  where e.status = 'published' and l.kind = 'line'
)
select
  s.id as speaker_id,
  count(distinct l.entry_id)::int as entry_count,
  count(*)::int as line_count,
  count(*) filter (where l.is_punchline)::int as punchline_count,
  (10 * count(distinct l.entry_id) + count(*) + 5 * count(*) filter (where l.is_punchline))::int
    as points
from public.speakers s
join lines l on l.speaker_id = s.id
group by s.id;

grant select on public.speaker_points to anon, authenticated;
