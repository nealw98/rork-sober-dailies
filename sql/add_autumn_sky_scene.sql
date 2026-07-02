-- Register the "Autumn Sky" meditation scene.
-- Run in the Supabase SQL editor. Idempotent — safe to re-run.
--
-- Assets uploaded to the bucket roots (verified live):
--   • meditation-images/autumn-sunrise.webp        (203 KB, image/webp)
--   • meditation-audio/autumn-sky-meditation.m4a   (11.4 MB, 96 kbps stereo AAC)

insert into public.meditation_scenes
  (scene_key, name, still_path, animated_path, audio_path, audio_license, sort_order, is_active)
values
  ('autumn-sky', 'Autumn Sky', 'autumn-sunrise.webp', null, 'autumn-sky-meditation.m4a', '', 0, true)
on conflict (scene_key) do update set
  name          = excluded.name,
  still_path    = excluded.still_path,
  animated_path = excluded.animated_path,
  audio_path    = excluded.audio_path,
  sort_order    = excluded.sort_order,
  is_active     = excluded.is_active;

-- Order Autumn Sky first; keep the placeholder seeds behind it.
update public.meditation_scenes set sort_order = case scene_key
  when 'silence' then 1 when 'rain' then 2 when 'ocean' then 3 when 'forest' then 4
  else sort_order end
where scene_key in ('silence', 'rain', 'ocean', 'forest');
