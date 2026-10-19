-- Deleting an entry ----------------------------------------------------------------------------
-- Removes an entry for good; its lines and moderation links go with it (on delete cascade).
-- Speakers stay: one left without lines is already hidden from the public, and deleting it here
-- could break a submission naming that speaker at the same moment. Returns the photo path, which
-- the caller removes from storage; raises no_data_found when the entry is already gone.
create function public.delete_entry(p_entry_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_image text;
begin
  delete from public.entries where id = p_entry_id returning image_path into deleted_image;
  if not found then
    raise exception 'Entry % does not exist', p_entry_id using errcode = 'P0002';
  end if;
  return deleted_image;
end;
$$;

-- For the service role only. (Supabase grants execute on new functions to every API role.)
revoke execute on function public.delete_entry(uuid) from public, anon, authenticated;
