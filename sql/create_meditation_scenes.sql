-- Meditation "scenes" (ambiences) — the v2 data contract.
-- One row per scene bundles a still image, an OPTIONAL animated version
-- (animated webp / video — null = use a Ken Burns pan/zoom on the still in-app),
-- and an OPTIONAL looping audio track (null = silent). Keyed by a STABLE
-- `scene_key` that matches the app's persisted soundtrack id, so the user's saved
-- choice (silence/rain/ocean/forest/…) maps straight in with no migration.
--
-- Read-only content (like daily-reflection-images): public buckets + anon SELECT.
-- Run in the Supabase SQL editor. Idempotent — safe to re-run.

-- ─── 1. Table ────────────────────────────────────────────────────────────────
create table if not exists public.meditation_scenes (
  id                uuid        not null default gen_random_uuid(),
  scene_key         text        not null,                                  -- stable id: silence | rain | ocean | forest | …
  name              text        not null,                                  -- display label
  image_bucket      text        not null default 'meditation-images',
  still_path        text,                                                  -- still image object path (null → app fallback)
  animated_path     text,                                                  -- animated webp / video path (null → Ken Burns the still)
  audio_bucket      text        not null default 'meditation-audio',
  audio_path        text,                                                  -- looping audio path (null → silent)
  audio_license     text        not null default '',                      -- e.g. 'CC0', 'CC-BY' (for the credits manifest)
  audio_attribution text        not null default '',                      -- credit text, shown in a Sound Credits screen if required
  is_active         boolean     not null default true,
  sort_order        integer     not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint meditation_scenes_pkey primary key (id),
  constraint meditation_scenes_scene_key_key unique (scene_key)
);

-- Keep updated_at fresh on edits.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists meditation_scenes_set_updated_at on public.meditation_scenes;
create trigger meditation_scenes_set_updated_at
  before update on public.meditation_scenes
  for each row execute function public.set_updated_at();

-- ─── 2. Row-Level Security — anon (the app) can read active scenes ───────────
alter table public.meditation_scenes enable row level security;

drop policy if exists "anon can read active meditation scenes" on public.meditation_scenes;
create policy "anon can read active meditation scenes"
  on public.meditation_scenes for select
  to anon, authenticated
  using (is_active);

-- ─── 3. Storage buckets (public, like daily-reflection-images) ───────────────
-- Public read is automatic for public buckets (getPublicUrl works, no objects
-- policy needed). Uploads via the dashboard use the service role.
insert into storage.buckets (id, name, public)
values
  ('meditation-images', 'meditation-images', true),
  ('meditation-audio',  'meditation-audio',  true)
on conflict (id) do nothing;

-- ─── 4. Seed the v1 scenes (stable keys; asset paths filled in later) ────────
insert into public.meditation_scenes (scene_key, name, sort_order) values
  ('silence', 'Silence',  0),
  ('rain',    'Rainfall', 1),
  ('ocean',   'Ocean',    2),
  ('forest',  'Forest',   3)
on conflict (scene_key) do nothing;

-- ─── How to add assets (per scene) ───────────────────────────────────────────
--   1. Upload the still (+ optional animated webp) to the `meditation-images`
--      bucket, and the audio loop to `meditation-audio`.
--   2. Point the row at them, e.g.:
--        update public.meditation_scenes
--           set still_path    = 'rain/still.webp',
--               animated_path = 'rain/loop.webp',     -- optional; leave null for Ken Burns
--               audio_path    = 'rain/loop.mp3',      -- optional; leave null for silent
--               audio_license = 'CC0'
--         where scene_key = 'rain';
--   App reads: select * from meditation_scenes where is_active order by sort_order,
--   then storage.from(bucket).getPublicUrl(path) per asset.
