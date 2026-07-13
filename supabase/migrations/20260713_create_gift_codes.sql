-- Pass It On (gift codes) — backend store.
--
-- One row per minted gift code. Two states only (spec §6.2/§9): available |
-- redeemed. `redeemed` is the sole consuming, irreversible transition and is
-- enforced server-side with a first-redeemer-wins atomic UPDATE (see the
-- gifts-redeem edge function). No "sent/given" state, no share tracking.
--
-- Identity is the app's device identity for this round (spec §7 light-account
-- layer deferred, risk accepted): buyer/redeemer are pinned to `anonymous_id`
-- (SecureStore, survives iOS reinstall) plus the RevenueCat app_user_id used to
-- grant the recipient's promotional entitlement.
--
-- All access goes through the gifts-* edge functions using the service role,
-- which bypasses RLS. RLS is enabled with NO policies so the anon key (shipped
-- in the client) can neither read other people's codes nor mint/redeem directly.

create table if not exists public.gift_codes (
  code                    text primary key,           -- SD-XXXX-XXXX
  product_id              text not null,              -- gift_3mo_single | _pack5 | _pack10
  status                  text not null default 'available'
                            check (status in ('available', 'redeemed')),

  -- Giver
  buyer_anonymous_id      text not null,
  buyer_rc_app_user_id    text,
  purchase_transaction_id text,                       -- RC store_transaction_id — idempotent minting key
  created_at              timestamptz not null default now(),

  -- Recipient (set exactly once, at redemption)
  redeemed_at             timestamptz,
  redeemer_anonymous_id   text,
  redeemer_rc_app_user_id text
);

create index if not exists gift_codes_buyer_idx
  on public.gift_codes (buyer_anonymous_id);

-- Idempotent minting: a given store transaction mints its codes exactly once,
-- even if the client retries gifts-purchase (kill-mid-purchase, receipt replay).
create index if not exists gift_codes_txn_idx
  on public.gift_codes (purchase_transaction_id);

alter table public.gift_codes enable row level security;
-- Intentionally NO policies: only the service role (edge functions) touches this
-- table. Direct anon access is denied.
