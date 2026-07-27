-- Developer pass grants — the "Grant 5 passes" button in the Developer Console.
--
-- The automatic grants (annual_y1, tenure_3, founding_y1…) are derived from
-- RevenueCat state on every credits-status call. This is the hand-cranked
-- version for promo: same ledger, same balance math, no subscription event
-- behind it. Keys are stamped `manual_<utc iso>`, a shape computeEarnedGrants
-- never emits, so grant-on-read can neither collide with nor re-trigger them.
--
-- SAFEGUARD: the Developer Console is only hidden (long-press the version
-- number), not locked, and the anon key ships in the app bundle — so the guard
-- must live server-side. dev_pass_granters is the allowlist: RLS on with no
-- policies, so the anon key can't read or grow it; only the dashboard (service
-- role) can. The RPC is SECURITY DEFINER so it can check the list and write
-- the grant while both tables stay closed to clients. Empty list = nobody can
-- grant, which is the fail-closed default.
--
-- Deploy = paste this whole file into the Supabase SQL editor, then insert
-- your device id (Developer Console → THIS DEVICE → Device ID) at the bottom.

-- Retired earlier same-day approach, if it was ever created.
drop function if exists public.grant_manual_passes(text, int);

create table if not exists public.dev_pass_granters (
  anonymous_id  text primary key,
  note          text,
  created_at    timestamptz not null default now()
);

alter table public.dev_pass_granters enable row level security;
-- Intentionally NO policies — same posture as the gift tables.

create or replace function public.dev_grant_passes(
  p_anonymous_id text,
  p_credits      int default 5
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
begin
  -- A hand grant is a promo action, not a bulk loader.
  if p_credits is null or p_credits < 1 or p_credits > 25 then
    raise exception 'Pass count must be between 1 and 25.';
  end if;

  if not exists (select 1 from public.dev_pass_granters g
                 where g.anonymous_id = p_anonymous_id) then
    raise exception 'This device isn''t allowed to grant passes.';
  end if;

  v_key := 'manual_' || to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

  -- Two grants inside the same second land on one key; adding them together is
  -- what "I tapped it twice" should mean, so no unique-violation surprise.
  insert into public.gift_credit_grants (anonymous_id, grant_key, credits)
  values (p_anonymous_id, v_key, p_credits)
  on conflict (anonymous_id, grant_key)
    do update set credits = gift_credit_grants.credits + excluded.credits;

  return public.gift_credit_balance(p_anonymous_id);
end $$;

revoke all on function public.dev_grant_passes(text, int) from public;
grant execute on function public.dev_grant_passes(text, int) to anon;

-- Allowlist a device (run per device, editing the values):
-- insert into public.dev_pass_granters (anonymous_id, note)
-- values ('<device id from the Developer Console>', 'whose phone this is')
-- on conflict (anonymous_id) do nothing;
