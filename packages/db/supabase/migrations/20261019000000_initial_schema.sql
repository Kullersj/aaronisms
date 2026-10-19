-- Aaronisms initial schema: enums, tables, indexes, search, RLS.
-- Moderators are not stored here; they come from MODERATOR_EMAILS (see the migration plan).

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.entry_status as enum ('pending', 'published', 'rejected');
create type public.entry_era as enum ('modern', 'college');
create type public.line_kind as enum ('line', 'stage', 'context');

create table public.speakers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  said_on date,
  era public.entry_era not null default 'modern',
  status public.entry_status not null default 'pending',
  image_path text,
  image_alt text,
  submitted_by text,
  submitter_ip inet,
  reviewed_by_email text,
  decision_note text,
  no_preview boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  search tsvector
);

create table public.entry_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries on delete cascade,
  position int not null,
  kind public.line_kind not null default 'line',
  speaker_id uuid references public.speakers,
  speaker_label text,
  text text not null,
  unique (entry_id, position)
);

create table public.memes (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  caption text,
  status public.entry_status not null default 'published',
  created_at timestamptz not null default now()
);

create table public.moderation_tokens (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries on delete cascade,
  moderator_email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz
);

create index entries_status_said_on_idx on public.entries (status, said_on desc);
create index entries_search_idx on public.entries using gin (search);
create index entry_lines_speaker_id_idx on public.entry_lines (speaker_id);
create index moderation_tokens_entry_id_idx on public.moderation_tokens (entry_id);

-- Search ---------------------------------------------------------------------

-- Rebuilds entries.search from line text, speaker names/labels and the image alt text.
create function public.refresh_entry_search(target uuid)
returns void
language sql
set search_path = ''
as $$
  update public.entries e
  set search = to_tsvector(
    'simple',
    concat_ws(
      ' ',
      e.image_alt,
      (
        select string_agg(concat_ws(' ', s.name, l.speaker_label, l.text), ' ' order by l.position)
        from public.entry_lines l
        left join public.speakers s on s.id = l.speaker_id
        where l.entry_id = e.id
      )
    )
  )
  where e.id = target;
$$;

create function public.entry_lines_refresh_search()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_entry_search(old.entry_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.entry_id <> old.entry_id) then
    perform public.refresh_entry_search(new.entry_id);
  end if;
  return null;
end;
$$;

create trigger entry_lines_search
after insert or update or delete on public.entry_lines
for each row execute function public.entry_lines_refresh_search();

create function public.entries_refresh_search()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.refresh_entry_search(new.id);
  return null;
end;
$$;

create trigger entries_search
after insert or update of image_alt on public.entries
for each row execute function public.entries_refresh_search();

create function public.speakers_refresh_search()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  affected uuid;
begin
  for affected in select distinct entry_id from public.entry_lines where speaker_id = new.id loop
    perform public.refresh_entry_search(affected);
  end loop;
  return null;
end;
$$;

create trigger speakers_search
after update of name on public.speakers
for each row execute function public.speakers_refresh_search();

-- Full-text match on the tsvector, with a trigram fallback so typos still find things.
create function public.search_entries(q text)
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
  with query as (
    select websearch_to_tsquery('simple', q) as tsq
  )
  select
    e.id, e.slug, e.said_on, e.era, e.image_path, e.image_alt, e.published_at,
    (ts_rank(e.search, query.tsq) + extensions.word_similarity(q, body.text))::real as rank
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
    and (e.search @@ query.tsq or extensions.word_similarity(q, body.text) > 0.4)
  order by rank desc, e.said_on desc nulls last, e.slug;
$$;

create function public.random_published_entry_slug()
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select slug from public.entries where status = 'published' order by random() limit 1;
$$;

-- Row-level security ----------------------------------------------------------
-- Writes happen only in server code with the service role, which bypasses RLS.

alter table public.speakers enable row level security;
alter table public.entries enable row level security;
alter table public.entry_lines enable row level security;
alter table public.memes enable row level security;
alter table public.moderation_tokens enable row level security;

create policy "Speakers are public" on public.speakers
  for select to anon, authenticated using (true);

create policy "Published entries are public" on public.entries
  for select to anon, authenticated using (status = 'published');

create policy "Lines of published entries are public" on public.entry_lines
  for select to anon, authenticated using (
    exists (
      select 1 from public.entries e
      where e.id = entry_lines.entry_id and e.status = 'published'
    )
  );

create policy "Published memes are public" on public.memes
  for select to anon, authenticated using (status = 'published');

-- Grants: start from nothing for the API roles, then allow reads only.
-- Private entry columns (submitter_ip, reviewed_by_email, decision_note) are never granted,
-- so select explicit columns instead of `select *` from the browser or anon client.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;

grant select on public.speakers, public.entry_lines, public.memes to anon, authenticated;
grant select (
  id, slug, said_on, era, status, image_path, image_alt, submitted_by, no_preview,
  published_at, created_at, search
) on public.entries to anon, authenticated;
grant execute on function public.search_entries(text) to anon, authenticated;
grant execute on function public.random_published_entry_slug() to anon, authenticated;

-- Trigger helpers are internal; Postgres and Supabase grant execute to these roles by default.
revoke execute on function
  public.refresh_entry_search(uuid),
  public.entry_lines_refresh_search(),
  public.entries_refresh_search(),
  public.speakers_refresh_search()
from public, anon, authenticated;
