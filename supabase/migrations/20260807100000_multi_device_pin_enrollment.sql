-- A restored backup intentionally carries the member's anonymous_id to a new
-- device, but each installation generates its own private device secret.
-- Permit more than one proven installation to own the shared identity.
alter table public.device_claims drop constraint if exists device_claims_pkey;
alter table public.device_claims
  add primary key (anonymous_id, secret_hash);

-- Brute-force protection for Developer Console PIN enrollment. Service-role
-- Edge Functions are the only readers/writers; no client policies are added.
create table if not exists public.developer_pin_attempts (
  anonymous_id text primary key,
  attempts integer not null default 0 check (attempts >= 0),
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.developer_pin_attempts enable row level security;
revoke all on public.developer_pin_attempts from anon, authenticated;
