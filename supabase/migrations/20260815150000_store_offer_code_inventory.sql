-- Pass It On now uses store-native annual subscription offer codes on both
-- platforms. Existing inventory is Apple inventory; the new platform column
-- lets Google Play one-time promo codes share the same atomic queue without
-- weakening the one-code-per-pass guarantee.

alter table public.offer_code_inventory
  add column if not exists platform text;

update public.offer_code_inventory
   set platform = 'ios'
 where platform is null;

alter table public.offer_code_inventory
  alter column platform set default 'ios',
  alter column platform set not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.offer_code_inventory'::regclass
       and conname = 'offer_code_inventory_platform_check'
  ) then
    alter table public.offer_code_inventory
      add constraint offer_code_inventory_platform_check
      check (platform in ('ios', 'android'));
  end if;
end
$$;

drop index if exists public.offer_code_available_idx;
create index offer_code_available_idx
  on public.offer_code_inventory (platform, product)
  where dispensed_at is null;

-- Store-neutral annual-only dispenser. The public edge function validates the
-- share token and calls this service-role-only function. Both Apple and Google
-- codes are already bound by their stores to an annual subscription; product
-- remains explicit here as a defense against accidentally loading or serving a
-- monthly batch later.
create or replace function public.dispense_store_offer_code(
  p_token text,
  p_platform text
)
returns table (code text, redeem_url text, product text, platform text)
language plpgsql as $$
begin
  if p_platform not in ('ios', 'android') then
    return;
  end if;
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
     select c.code
       from public.offer_code_inventory c
      where c.platform = p_platform
        and c.product = 'yearly'
        and c.dispensed_at is null
        and (c.expires_at is null or c.expires_at > now() + interval '7 days')
      order by c.expires_at nulls last, c.created_at
      limit 1
      for update skip locked
   )
  returning i.code, i.redeem_url, i.product, i.platform;
end;
$$;

revoke execute on function public.dispense_store_offer_code(text, text)
  from public, anon, authenticated;

-- Rollout safety for the old website bundle: it still calls the Apple-only
-- function with monthly/yearly. Until every browser has the new bundle, both
-- choices must resolve to the active yearly inventory because the monthly
-- App Store offer has been deactivated.
create or replace function public.dispense_offer_code(p_token text, p_product text)
returns table (code text, redeem_url text, product text)
language plpgsql as $$
begin
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
     select c.code
       from public.offer_code_inventory c
      where c.platform = 'ios'
        and c.product = 'yearly'
        and c.dispensed_at is null
        and (c.expires_at is null or c.expires_at > now() + interval '7 days')
      order by c.expires_at nulls last, c.created_at
      limit 1
      for update skip locked
   )
  returning i.code, i.redeem_url, i.product;
end;
$$;

revoke execute on function public.dispense_offer_code(text, text)
  from public, anon, authenticated;
