-- Daily Reflections hero image storage and metadata.
--
-- The redesign should not depend on a bundled final hero image. Store the image
-- in Supabase Storage and expose a small public-read metadata table so the app
-- can resolve the active hero image at runtime.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'daily-reflection-images',
  'daily-reflection-images',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.app_image_assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null unique,
  bucket text not null,
  object_path text not null,
  alt_text text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_image_assets enable row level security;

drop policy if exists "Public can read active image assets" on public.app_image_assets;
create policy "Public can read active image assets"
on public.app_image_assets
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read daily reflection images" on storage.objects;
create policy "Public can read daily reflection images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'daily-reflection-images');

insert into public.app_image_assets (
  asset_key,
  bucket,
  object_path,
  alt_text,
  is_active
)
values (
  'daily_reflections.hero',
  'daily-reflection-images',
  'daily-reflections/reflection_bg7.webp',
  'A peaceful outdoor recovery reflection scene',
  true
)
on conflict (asset_key) do update
set
  bucket = excluded.bucket,
  object_path = excluded.object_path,
  alt_text = excluded.alt_text,
  is_active = excluded.is_active,
  updated_at = now();
