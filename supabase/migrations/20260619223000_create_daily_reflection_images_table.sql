-- Dedicated Daily Reflections hero image rotation table.
--
-- Storage holds the image files. This table tells the app which images are
-- available, active, and how they should be ordered or date-limited.

create table if not exists public.daily_reflection_images (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'daily-reflection-images',
  object_path text not null,
  title text,
  alt_text text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_reflection_images_unique_object unique (bucket, object_path),
  constraint daily_reflection_images_date_window check (
    starts_on is null
    or ends_on is null
    or starts_on <= ends_on
  )
);

alter table public.daily_reflection_images enable row level security;

drop policy if exists "Public can read active daily reflection images" on public.daily_reflection_images;
create policy "Public can read active daily reflection images"
on public.daily_reflection_images
for select
to anon, authenticated
using (
  is_active = true
  and (starts_on is null or starts_on <= current_date)
  and (ends_on is null or ends_on >= current_date)
);

create index if not exists idx_daily_reflection_images_active_order
on public.daily_reflection_images (is_active, sort_order, created_at);

insert into public.daily_reflection_images (
  bucket,
  object_path,
  title,
  alt_text,
  is_active,
  sort_order
)
values (
  'daily-reflection-images',
  'daily-reflections/reflection_bg7.webp',
  'Daily Reflections hero',
  'A peaceful outdoor recovery reflection scene',
  true,
  10
)
on conflict (bucket, object_path) do update
set
  title = excluded.title,
  alt_text = excluded.alt_text,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
