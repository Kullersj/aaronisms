-- Submissions and moderation: atomic write paths, first-decision-wins, rate limiting.
-- Every function here is callable by the service role only; the app reaches them from server code.

-- Speakers are visible only once they appear in a published entry, so a pending submission
-- cannot leak (or spam) names through the public API.
drop policy "Speakers are public" on public.speakers;
create policy "Speakers of published entries are public" on public.speakers
  for select to anon, authenticated using (
    exists (
      select 1
      from public.entry_lines l
      join public.entries e on e.id = l.entry_id
      where l.speaker_id = speakers.id and e.status = 'published'
    )
  );

-- Rate limiting ---------------------------------------------------------------
create table public.rate_limit_hits (
  bucket text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_hits_bucket_idx on public.rate_limit_hits (bucket, created_at);
create index rate_limit_hits_created_at_idx on public.rate_limit_hits (created_at);
alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

-- Records a hit and returns true while the bucket is under its limit for the window.
-- The advisory lock makes check-then-insert atomic per bucket.
create function public.consume_rate_limit(p_bucket text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(p_bucket));
  delete from public.rate_limit_hits where created_at < now() - interval '1 day';
  if (
    select count(*) from public.rate_limit_hits
    where bucket = p_bucket and created_at >= now() - make_interval(secs => p_window_seconds)
  ) >= p_limit then
    return false;
  end if;
  insert into public.rate_limit_hits (bucket) values (p_bucket);
  return true;
end;
$$;

-- Entry content ---------------------------------------------------------------
-- Next free slug for a date: `2026-10-12-1`, `2026-10-12-2`, ...
create function public.entry_slug_for(p_date date)
returns text
language plpgsql
set search_path = ''
as $$
declare
  next_n int;
begin
  perform pg_advisory_xact_lock(hashtext('entry-slug:' || p_date::text));
  select coalesce(max((regexp_match(slug, '-(\d+)$'))[1]::int), 0) + 1
  into next_n
  from public.entries
  where said_on = p_date;
  return to_char(p_date, 'YYYY-MM-DD') || '-' || next_n;
end;
$$;

-- Replaces an entry's lines, and moves it to a new date (with a new slug) when one is given.
-- p_lines is an array of {kind, speaker_id, speaker_label, text}; order becomes position.
create function public.replace_entry_content(p_entry_id uuid, p_said_on date, p_lines jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'An entry needs at least one line' using errcode = '22023';
  end if;

  if p_said_on is not null then
    update public.entries
    set said_on = p_said_on, era = 'modern', slug = public.entry_slug_for(p_said_on)
    where id = p_entry_id and said_on is distinct from p_said_on;
  end if;

  delete from public.entry_lines where entry_id = p_entry_id;
  insert into public.entry_lines (entry_id, position, kind, speaker_id, speaker_label, text)
  select
    p_entry_id,
    t.position::int,
    (t.line ->> 'kind')::public.line_kind,
    nullif(t.line ->> 'speaker_id', '')::uuid,
    nullif(t.line ->> 'speaker_label', ''),
    t.line ->> 'text'
  from jsonb_array_elements(p_lines) with ordinality as t(line, position);
end;
$$;

-- Creates a pending entry, its lines and one moderation token per moderator in one transaction.
-- p_tokens is an array of {email, token_hash, expires_at}. Returns the new slug.
create function public.create_submission(
  p_entry_id uuid,
  p_said_on date,
  p_lines jsonb,
  p_tokens jsonb,
  p_submitted_by text default null,
  p_ip inet default null,
  p_image_path text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_slug text := public.entry_slug_for(p_said_on);
begin
  insert into public.entries (id, slug, said_on, status, submitted_by, submitter_ip, image_path)
  values (p_entry_id, new_slug, p_said_on, 'pending', p_submitted_by, p_ip, p_image_path);

  perform public.replace_entry_content(p_entry_id, null, p_lines);

  insert into public.moderation_tokens (entry_id, moderator_email, token_hash, expires_at)
  select p_entry_id, t.email, t.token_hash, t.expires_at
  from jsonb_to_recordset(p_tokens) as t(email text, token_hash text, expires_at timestamptz);

  return new_slug;
end;
$$;

-- Edits any entry's date and lines atomically (admin). Returns the possibly new slug.
create function public.apply_entry_edits(p_entry_id uuid, p_lines jsonb, p_said_on date default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_slug text;
begin
  perform 1 from public.entries where id = p_entry_id for update;
  if not found then
    raise exception 'Entry not found' using errcode = 'P0002';
  end if;
  perform public.replace_entry_content(p_entry_id, p_said_on, p_lines);
  select slug into current_slug from public.entries where id = p_entry_id;
  return current_slug;
end;
$$;

-- Moves every line from one speaker to another and deletes the first (admin merge).
create function public.merge_speakers(p_from uuid, p_into uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_from = p_into then
    raise exception 'Cannot merge a speaker into itself' using errcode = '22023';
  end if;
  update public.entry_lines set speaker_id = p_into where speaker_id = p_from;
  delete from public.speakers where id = p_from;
end;
$$;

-- Moderation ------------------------------------------------------------------
create type public.moderation_result as (
  outcome text,            -- open | decided | already_decided | invalid | expired
  entry_id uuid,
  entry_slug text,
  status public.entry_status,
  reviewed_by_email text,
  decision_note text
);

create function public.entry_result(p_outcome text, p_entry_id uuid)
returns public.moderation_result
language sql
set search_path = ''
as $$
  select p_outcome, e.id, e.slug, e.status, e.reviewed_by_email, e.decision_note
  from public.entries e
  where e.id = p_entry_id;
$$;

-- Read-only: what would opening this token's link show? Never changes anything.
-- Volatile on purpose, so a call made after a row lock re-reads the latest committed state.
create function public.moderation_token_state(p_token_hash text, p_allowed_emails text[])
returns public.moderation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  token public.moderation_tokens;
  entry public.entries;
  outcome text;
begin
  select * into token from public.moderation_tokens where token_hash = p_token_hash;
  if not found or not (token.moderator_email = any (p_allowed_emails)) then
    return row('invalid', null, null, null, null, null)::public.moderation_result;
  end if;
  select * into entry from public.entries where id = token.entry_id;
  outcome := case
    when entry.status <> 'pending' then 'already_decided'
    when token.used_at is not null then 'invalid'
    when token.expires_at <= now() then 'expired'
    else 'open'
  end;
  return public.entry_result(outcome, entry.id);
end;
$$;

-- Approves or rejects a pending entry (optionally editing it first) and retires its tokens.
-- The caller must already hold the row lock and have checked the entry is pending.
create function public.apply_decision(
  p_entry_id uuid,
  p_decision text,
  p_reviewer_email text,
  p_note text,
  p_said_on date,
  p_lines jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_lines is not null then
    perform public.replace_entry_content(p_entry_id, p_said_on, p_lines);
  end if;
  if p_decision = 'approve' then
    update public.entries
    set status = 'published', published_at = now(), reviewed_by_email = p_reviewer_email
    where id = p_entry_id;
  else
    update public.entries
    set status = 'rejected', reviewed_by_email = p_reviewer_email, decision_note = p_note
    where id = p_entry_id;
  end if;
  update public.moderation_tokens set used_at = now() where entry_id = p_entry_id and used_at is null;
end;
$$;

-- Decides an entry through an emailed token. The first decision wins: the entry row is locked,
-- so a concurrent second decision waits, then finds the entry already decided.
-- p_lines (with optional p_said_on) edits the entry in the same transaction as the decision.
create function public.decide_entry(
  p_token_hash text,
  p_allowed_emails text[],
  p_decision text,
  p_note text default null,
  p_said_on date default null,
  p_lines jsonb default null
)
returns public.moderation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  token public.moderation_tokens;
  state public.moderation_result;
begin
  if p_decision not in ('approve', 'reject') then
    raise exception 'Unknown decision: %', p_decision using errcode = '22023';
  end if;

  select * into token from public.moderation_tokens where token_hash = p_token_hash;
  if not found then
    return public.moderation_token_state(p_token_hash, p_allowed_emails);
  end if;

  perform 1 from public.entries where id = token.entry_id for update;
  state := public.moderation_token_state(p_token_hash, p_allowed_emails);
  if state.outcome <> 'open' then
    return state;
  end if;

  perform public.apply_decision(
    token.entry_id, p_decision, token.moderator_email, p_note, p_said_on, p_lines
  );
  return public.entry_result('decided', token.entry_id);
end;
$$;

-- The same decision for the signed-in admin, who needs no token.
create function public.decide_entry_as_admin(
  p_entry_id uuid,
  p_admin_email text,
  p_decision text,
  p_note text default null,
  p_said_on date default null,
  p_lines jsonb default null
)
returns public.moderation_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.entry_status;
begin
  if p_decision not in ('approve', 'reject') then
    raise exception 'Unknown decision: %', p_decision using errcode = '22023';
  end if;

  select status into current_status from public.entries where id = p_entry_id for update;
  if not found then
    return row('invalid', null, null, null, null, null)::public.moderation_result;
  end if;
  if current_status <> 'pending' then
    return public.entry_result('already_decided', p_entry_id);
  end if;

  perform public.apply_decision(p_entry_id, p_decision, p_admin_email, p_note, p_said_on, p_lines);
  return public.entry_result('decided', p_entry_id);
end;
$$;

-- Grants: the entry points are for the service role only; internal helpers are for nobody.
-- (Supabase grants execute on new functions to every API role by default.)
revoke execute on function
  public.consume_rate_limit(text, int, int),
  public.create_submission(uuid, date, jsonb, jsonb, text, inet, text),
  public.apply_entry_edits(uuid, jsonb, date),
  public.merge_speakers(uuid, uuid),
  public.moderation_token_state(text, text[]),
  public.decide_entry(text, text[], text, text, date, jsonb),
  public.decide_entry_as_admin(uuid, text, text, text, date, jsonb)
from public, anon, authenticated;

revoke execute on function
  public.entry_slug_for(date),
  public.replace_entry_content(uuid, date, jsonb),
  public.entry_result(text, uuid),
  public.apply_decision(uuid, text, text, text, date, jsonb)
from public, anon, authenticated, service_role;
