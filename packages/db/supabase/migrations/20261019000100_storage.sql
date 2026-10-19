-- Public-read bucket for entry and meme images. Writes use the service role only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aaronism-images',
  'aaronism-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do nothing;

create policy "Aaronism images are public" on storage.objects
  for select to anon, authenticated using (bucket_id = 'aaronism-images');
