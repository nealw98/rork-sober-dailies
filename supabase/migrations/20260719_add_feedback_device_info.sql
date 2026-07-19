-- Device/troubleshooting context for app feedback (mirrors Daily Paths):
-- model, OS version, screen size, font scale, manufacturer (Android only).
alter table public.app_feedback
  add column if not exists device_model text,
  add column if not exists os_version text,
  add column if not exists screen_width integer,
  add column if not exists screen_height integer,
  add column if not exists font_scale numeric,
  add column if not exists manufacturer text;
