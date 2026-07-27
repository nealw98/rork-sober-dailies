-- Passes are spent on DELIVERY, not on opening the composer (Neal, 2026-07-27).
--
-- The token has to be minted before the SMS composer opens — you can't put a
-- link in a message that doesn't exist yet — so every gift_shares row counted
-- against the sender's balance the moment the composer appeared. Cancelling
-- the text left the row, and the credit, spent. The pending-token reuse in
-- lib/creditsService.ts softened that (the next gift reuses the unsent token
-- rather than minting a second one) but never gave the credit back, so the
-- balance under-reported what the member could actually give.
--
-- sent_at records the only event that costs anything: a link that reached a
-- person. getCreditState now counts rows where it is set. An unsent token is
-- free — no Apple offer code leaves inventory until a recipient opens /get.
--
-- Existing rows are deliberately left NULL. All three that exist as of this
-- migration were composer cancels, verified 2026-07-27 against
-- offer_code_inventory (zero dispensed), so backfilling them as sent would
-- charge for gifts that were never delivered.
alter table public.gift_shares
  add column if not exists sent_at timestamptz;

comment on column public.gift_shares.sent_at is
  'When the share text was actually delivered. NULL = minted for a composer that was cancelled; does not count against the sender''s balance.';

-- The balance read is "count my delivered shares" — index for exactly that.
create index if not exists gift_shares_sender_sent_idx
  on public.gift_shares (sender_anonymous_id) where sent_at is not null;

-- Keep the SQL balance in step with getCreditState (_shared/credits.ts). Both
-- must count DELIVERED shares only, or the two disagree: dev_grant_passes
-- returns THIS function and the Developer Console caches it, while the badge
-- and Pass It On read credits-status. On a device holding an unsent token the
-- grant button would say 4 and the next status refresh would say 5.
-- `create or replace` keeps the existing GRANTs — anon still cannot call it
-- directly; dev_grant_passes reaches it as SECURITY DEFINER.
--
-- ⚠️ `set search_path = public` is NOT decoration and must not be dropped.
-- CREATE OR REPLACE FUNCTION resets any attribute the new definition omits, so
-- without this line we would silently revert the hardening Lovable's security
-- advisor applied in 20260724185725 (`ALTER FUNCTION ... SET search_path`) and
-- the next advisor scan would re-flag it. Same reason `stable` is restated.
create or replace function public.gift_credit_balance(p_anonymous_id text)
returns int
language sql stable
set search_path = public
as $$
  select (coalesce((select sum(credits) from public.gift_credit_grants
                    where anonymous_id = p_anonymous_id), 0)
        - coalesce((select count(*) from public.gift_shares
                    where sender_anonymous_id = p_anonymous_id
                      and sent_at is not null), 0))::int;
$$;
