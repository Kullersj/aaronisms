-- Private bucket for photos that must not be public: submissions waiting for review, rejected or
-- deleted entries. Access is by the service role only, which signs short-lived URLs for
-- moderators. There are deliberately no storage.objects policies, so anon and authenticated can
-- neither read nor list it. An approved photo is copied to the public bucket under a random name.
--
-- entries.image_path stays one text column: a path starting with 'private/' is an object in this
-- bucket; any other path (every existing row) is in the public 'aaronism-images' bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aaronism-images-private',
  'aaronism-images-private',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do nothing;
