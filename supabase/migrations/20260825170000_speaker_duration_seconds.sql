alter table public.speakers
  add column if not exists duration_seconds integer;

alter table public.speakers
  drop constraint if exists speakers_duration_seconds_nonnegative;

alter table public.speakers
  add constraint speakers_duration_seconds_nonnegative
  check (duration_seconds is null or duration_seconds >= 0);

comment on column public.speakers.duration_seconds is
  'Duration of the speaker recording in whole seconds, populated from the audio file metadata.';
