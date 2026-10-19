-- Deleting an entry ----------------------------------------------------------------------------
-- Removes an entry for good: its lines and moderation links go with it (on delete cascade), and so
-- does any speaker left with no lines at all. Returns the photo path, which the caller removes
-- from storage; raises no_data_found when the entry is already gone.
create function public.delete_entry(p_entry_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  speaker_ids uuid[];
  deleted_image text;
begin
  select coalesce(array_agg(distinct speaker_id) filter (where speaker_id is not null), '{}')
    into speaker_ids
    from public.entry_lines
    where entry_id = p_entry_id;

  delete from public.entries where id = p_entry_id returning image_path into deleted_image;
  if not found then
    raise exception 'Entry % does not exist', p_entry_id using errcode = 'P0002';
  end if;

  delete from public.speakers s
    where s.id = any(speaker_ids)
      and not exists (select 1 from public.entry_lines l where l.speaker_id = s.id);

  return deleted_image;
end;
$$;

-- For the service role only. (Supabase grants execute on new functions to every API role.)
revoke execute on function public.delete_entry(uuid) from public, anon, authenticated;
