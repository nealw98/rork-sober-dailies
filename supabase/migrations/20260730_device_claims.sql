-- Device ownership for the anonymous credit ledger.
--
-- The app has no accounts: a member IS their anonymous_id, and the client sends
-- that id in the request body. Before this table, credits-share trusted it — so
-- anyone who learned someone's id (it is visible in the app's own Support ID
-- modal, and users paste it into feedback emails) could mint a gift link under
-- that identity and burn their passes.
--
-- Trust-on-first-use: the first call that brings a device secret registers its
-- SHA-256; every later call for that id must present the same secret. Only the
-- hash is stored, and the table is service-role only (edge functions).
create table if not exists public.device_claims (
  anonymous_id text primary key,
  secret_hash  text not null,
  created_at   timestamptz not null default now()
);

alter table public.device_claims enable row level security;

-- No RLS policies on purpose: with RLS enabled and no policy, anon and
-- authenticated can do nothing. The service-role key used by the edge functions
-- bypasses RLS, which is the only access path that should exist.
revoke all on public.device_claims from anon, authenticated;
