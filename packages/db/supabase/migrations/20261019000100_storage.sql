-- Public-read bucket for entry and meme images. Writes use the service role only.
-- No select policy on storage.objects: public URLs serve without one, and a policy would let
-- anon list() every object, including images of pending entries.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aaronism-images',
  'aaronism-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do nothing;
