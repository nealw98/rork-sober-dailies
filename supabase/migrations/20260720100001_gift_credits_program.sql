-- Gift acquisition program — credits, share tokens, offer-code inventory.
-- (docs/invite-rewards-design.md §0. Recipients: Apple offer codes, "3 months
-- free then paid". Givers: gift credits by commitment tier.)
--
-- Flow: giver earns CREDITS (grant-on-read from RC subscription state) →
-- sharing consumes a credit and mints a TOKEN (the SMS carries
-- soberdailies.com/get?g=<token>, never a raw code) → the recipient picks a
-- plan on /get, which dispenses one Apple offer code from INVENTORY,
-- binding it to the token (idempotent: re-taps return the same code).
--
-- All tables: RLS on, no policies — service-role only via edge functions,
-- same posture as gift_codes. get-dispense is the only public-facing flow
-- and it authenticates by unguessable token, not by identity.

-- ── Apple one-time offer codes, loaded from ASC batch CSVs ────────────────
create table if not exists public.offer_code_inventory (
  code          text primary key,               -- Apple one-time code
  product       text not null check (product in ('monthly', 'yearly')),
  batch_id      text not null,                  -- ASC batch (e.g. '543009') for expiry sweeps
  redeem_url    text not null,                  -- full apps.apple.com/redeem URL from the CSV
  expires_at    timestamptz,                    -- ASC batch expiration
  share_token   text,                           -- set when dispensed to a recipient
  dispensed_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- Pop-queue lookups and the one-code-per-token guarantee.
create index if not exists offer_code_available_idx
  on public.offer_code_inventory (product) where dispensed_at is null;
create unique index if not exists offer_code_token_idx
  on public.offer_code_inventory (share_token) where share_token is not null;

alter table public.offer_code_inventory enable row level security;

-- ── Credit grants (the earn side of the ledger) ───────────────────────────
-- One row per grant event, keyed so grant-on-read is idempotent:
--   annual_y1, annual_y2…  — 5 credits per subscription year (upfront)
--   tenure_3, tenure_6…    — 1 credit per 3 paid months (monthly plan)
--   founding_y1…           — 5/yr for grandfathered v1 users (flag-gated)
create table if not exists public.gift_credit_grants (
  anonymous_id  text not null,
  grant_key     text not null,
  credits       int  not null check (credits > 0),
  granted_at    timestamptz not null default now(),
  primary key (anonymous_id, grant_key)
);

alter table public.gift_credit_grants enable row level security;

-- ── Shares (the spend side; token = the gift artifact) ────────────────────
create table if not exists public.gift_shares (
  token                text primary key,        -- unguessable, rides in the /get link
  sender_anonymous_id  text not null,
  android_gift_code    text,                    -- SD-XXXX fallback minted for an Android recipient
  created_at           timestamptz not null default now()
);

create index if not exists gift_shares_sender_idx
  on public.gift_shares (sender_anonymous_id);

alter table public.gift_shares enable row level security;

-- Balance = sum of grants minus count of shares.
create or replace function public.gift_credit_balance(p_anonymous_id text)
returns int
language sql stable as $$
  select (coalesce((select sum(credits) from public.gift_credit_grants
                    where anonymous_id = p_anonymous_id), 0)
        - coalesce((select count(*) from public.gift_shares
                    where sender_anonymous_id = p_anonymous_id), 0))::int;
$$;

revoke execute on function public.gift_credit_balance(text) from public, anon, authenticated;

-- Atomically pop one available, unexpired code for a product and bind it to
-- a share token. FOR UPDATE SKIP LOCKED makes concurrent dispenses race
-- safely. Returns nothing when the token is unknown, already bound (caller
-- re-reads the bound row), or stock is dry.
create or replace function public.dispense_offer_code(p_token text, p_product text)
returns table (code text, redeem_url text, product text)
language plpgsql as $$
begin
  -- Token must exist and not already have a code (idempotency handled by caller).
  if not exists (select 1 from public.gift_shares where token = p_token) then
    return;
  end if;
  if exists (select 1 from public.offer_code_inventory i where i.share_token = p_token) then
    return;
  end if;

  return query
  update public.offer_code_inventory i
     set share_token = p_token, dispensed_at = now()
   where i.code = (
     select c.code from public.offer_code_inventory c
      where c.product = p_product
        and c.dispensed_at is null
        and (c.expires_at is null or c.expires_at > now() + interval '7 days')
      order by c.expires_at nulls last, c.created_at
      limit 1
      for update skip locked)
  returning i.code, i.redeem_url, i.product;
end;
$$;

revoke execute on function public.dispense_offer_code(text, text) from public, anon, authenticated;
