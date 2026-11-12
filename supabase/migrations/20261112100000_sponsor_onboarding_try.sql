-- Onboarding "try the sponsors" allowance (onboarding v4, handoff 4).
--
-- During onboarding a device may send up to 3 messages to each sponsor and run
-- 1 Spot Check reflection, ever. Unlike sponsor_chat_daily_usage these counters
-- never reset, and they are separate from the 25/day sponsor and Spot Check
-- caps. Same reservation pattern: reserve before the provider call, refund if
-- it fails. Additive only — nothing the live app calls today changes.

create table if not exists public.sponsor_onboarding_usage (
  anonymous_id text not null,
  target text not null check (target in ('supportive', 'salty', 'grace', 'reflection')),
  message_count integer not null default 0 check (message_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (anonymous_id, target)
);

alter table public.sponsor_onboarding_usage enable row level security;
-- Intentionally no policies; clients cannot read or modify their counters.

create or replace function public.reserve_onboarding_message(
  p_anonymous_id text,
  p_target text
)
returns table(allowed boolean, message_count integer, try_limit integer, is_tester boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if p_target not in ('supportive', 'salty', 'grace', 'reflection') then
    raise exception 'Unknown onboarding target.';
  end if;
  v_limit := case when p_target = 'reflection' then 1 else 3 end;

  if p_anonymous_id is null or length(trim(p_anonymous_id)) < 8 then
    return query select false, 0, v_limit, false;
    return;
  end if;

  -- Tester devices (the same ones that get an elevated daily cap) are never
  -- limited by the one-time try and are not counted.
  if exists (
    select 1
    from public.authorized_devices d
    where d.anonymous_id = p_anonymous_id
      and d.enabled
      and (d.expires_at is null or d.expires_at > now())
      and 'llm_limit_override' = any(d.capabilities)
  ) then
    return query select true, 0, v_limit, true;
    return;
  end if;

  insert into public.sponsor_onboarding_usage as usage
    (anonymous_id, target, message_count, updated_at)
  values (p_anonymous_id, p_target, 1, now())
  on conflict (anonymous_id, target) do update
    set message_count = usage.message_count + 1,
        updated_at = now()
    where usage.message_count < v_limit
  returning usage.message_count into v_count;

  if v_count is null then
    select u.message_count into v_count
    from public.sponsor_onboarding_usage u
    where u.anonymous_id = p_anonymous_id
      and u.target = p_target;
    return query select false, coalesce(v_count, 0), v_limit, false;
  else
    return query select true, v_count, v_limit, false;
  end if;
end $$;

create or replace function public.refund_onboarding_message(
  p_anonymous_id text,
  p_target text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.sponsor_onboarding_usage
  set message_count = greatest(message_count - 1, 0), updated_at = now()
  where anonymous_id = p_anonymous_id
    and target = p_target;
$$;

revoke all on function public.reserve_onboarding_message(text, text) from public, anon, authenticated;
revoke all on function public.refund_onboarding_message(text, text) from public, anon, authenticated;
grant execute on function public.reserve_onboarding_message(text, text) to service_role;
grant execute on function public.refund_onboarding_message(text, text) to service_role;

-- Lets the admin Spend panel tell the free onboarding tries apart from real
-- chat. Existing rows and older function versions leave it false.
alter table public.sponsor_chat_usage
  add column if not exists onboarding boolean not null default false;
