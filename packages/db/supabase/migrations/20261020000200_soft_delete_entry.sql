-- Soft deletion, part 2: deleting an entry now only marks it deleted, keeping its lines and photo
-- so the admin can restore it by setting another status. Open moderation links stop working.
drop function public.delete_entry(uuid);

create function public.delete_entry(p_entry_id uuid, p_admin_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.entries
    set status = 'deleted', reviewed_by_email = p_admin_email, published_at = null
    where id = p_entry_id and status <> 'deleted';
  if not found then
    raise exception 'Entry % does not exist or is already deleted', p_entry_id using errcode = 'P0002';
  end if;
  update public.moderation_tokens set used_at = now() where entry_id = p_entry_id and used_at is null;
end;
$$;

-- For the service role only. (Supabase grants execute on new functions to every API role.)
revoke execute on function public.delete_entry(uuid, text) from public, anon, authenticated;
