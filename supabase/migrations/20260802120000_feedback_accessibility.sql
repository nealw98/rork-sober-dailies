-- Display/accessibility context on feedback rows, one jsonb blob:
-- pixel_ratio, color_scheme, screen_reader, bold_text, reduce_motion,
-- reduce_transparency, invert_colors, grayscale. Daily Paths lesson:
-- "broken display" reports are usually OS accessibility settings.
alter table public.app_feedback
  add column if not exists accessibility jsonb;
