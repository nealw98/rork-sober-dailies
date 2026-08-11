-- gifts-redeem enforces one code per person (step 2b) by looking for a prior
-- redemption under either recipient identity. gift_codes indexes the BUYER and
-- the purchase transaction, but nothing on the redeemer columns, so that guard
-- was a sequential scan over every code ever minted — on the hot path of every
-- redemption attempt.
--
-- Partial indexes: redeemer_* are null until a code is claimed, and only
-- non-null rows can ever match the lookup, so the nulls are dead weight.

create index if not exists gift_codes_redeemer_anon_idx
  on public.gift_codes (redeemer_anonymous_id)
  where redeemer_anonymous_id is not null;

create index if not exists gift_codes_redeemer_rc_idx
  on public.gift_codes (redeemer_rc_app_user_id)
  where redeemer_rc_app_user_id is not null;
