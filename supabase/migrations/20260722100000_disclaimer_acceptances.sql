-- Disclaimer acceptances — one row per device (anonymous_id) per disclaimer
-- version, recorded when the onboarding disclaimer step's checkbox + Continue
-- is confirmed. Service-role writes only (via the disclaimer-accept edge
-- function); RLS on with no policies so the anon key can't touch it.
create table if not exists public.disclaimer_acceptances (
  anonymous_id text not null,
  version text not null,
  accepted_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  platform text,
  app_version text,
  primary key (anonymous_id, version)
);

alter table public.disclaimer_acceptances enable row level security;
