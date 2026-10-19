-- Local development seed. Every entry here is made up; none of it is real site content.

insert into public.speakers (id, name, slug) values
  ('00000000-0000-4000-8000-000000000001', 'Test Aaron', 'test-aaron'),
  ('00000000-0000-4000-8000-000000000002', 'Pat Example', 'pat-example'),
  ('00000000-0000-4000-8000-000000000003', 'Sam Sample', 'sam-sample');

insert into public.entries (id, slug, said_on, era, status, submitted_by, published_at) values
  ('10000000-0000-4000-8000-000000000001', '2026-01-05-1', '2026-01-05', 'modern', 'published', null, '2026-01-06 12:00+00'),
  ('10000000-0000-4000-8000-000000000002', '2026-01-05-2', '2026-01-05', 'modern', 'published', 'Pat', '2026-01-06 12:05+00'),
  ('10000000-0000-4000-8000-000000000003', '2026-02-14-1', '2026-02-14', 'modern', 'published', null, '2026-02-15 09:00+00'),
  ('10000000-0000-4000-8000-000000000004', 'college-1', null, 'college', 'published', null, '2026-01-06 12:10+00'),
  ('10000000-0000-4000-8000-000000000005', '2026-03-01-1', '2026-03-01', 'modern', 'pending', 'Sam', null),
  ('10000000-0000-4000-8000-000000000006', '2026-03-02-1', '2026-03-02', 'modern', 'rejected', 'Anonymous', null);

update public.entries set decision_note = 'Not funny enough, sorry.', reviewed_by_email = 'moderator@example.com'
where slug = '2026-03-02-1';

insert into public.entry_lines (entry_id, position, kind, speaker_id, speaker_label, text) values
  ('10000000-0000-4000-8000-000000000001', 1, 'line', '00000000-0000-4000-8000-000000000001', null,
   'I would never eat a sandwich that has been to a party.'),
  ('10000000-0000-4000-8000-000000000002', 1, 'context', null, null, 'Looking at a very large pumpkin:'),
  ('10000000-0000-4000-8000-000000000002', 2, 'line', '00000000-0000-4000-8000-000000000001', null,
   'That is just a regular pumpkin that works out.'),
  ('10000000-0000-4000-8000-000000000002', 3, 'line', '00000000-0000-4000-8000-000000000002', null,
   'It is mostly a gourd, Test.'),
  ('10000000-0000-4000-8000-000000000002', 4, 'stage', null, null, 'Everyone nods slowly.'),
  ('10000000-0000-4000-8000-000000000002', 5, 'line', null, 'Everyone else (in unison)', 'Wow.'),
  ('10000000-0000-4000-8000-000000000003', 1, 'line', '00000000-0000-4000-8000-000000000003', null,
   'The lighthouse is closed on Tuesdays, which is when ships are least lost.'),
  ('10000000-0000-4000-8000-000000000004', 1, 'line', '00000000-0000-4000-8000-000000000001', null,
   'A bicycle is just a horse that has given up on feelings.'),
  ('10000000-0000-4000-8000-000000000005', 1, 'line', '00000000-0000-4000-8000-000000000003', null,
   'Pending quote about a very patient toaster.'),
  ('10000000-0000-4000-8000-000000000006', 1, 'line', '00000000-0000-4000-8000-000000000002', null,
   'Rejected quote about an unremarkable spoon.');

insert into public.memes (image_path, caption, status) values
  ('seed/meme-placeholder.png', 'A made-up meme caption', 'published');
