-- One server-side enrollment per trusted device, shared by every present and
-- future Developer Console capability. Existing pass granters are migrated so
-- Neal does not have to submit his device id again.

create table if not exists public.authorized_devices (
  anonymous_id text primary key,
  role text not null default 'tester' check (role in ('tester', 'admin')),
  capabilities text[] not null default '{}'::text[],
  llm_daily_limit integer not null default 250 check (llm_daily_limit between 1 and 10000),
  enabled boolean not null default true,
  expires_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.authorized_devices enable row level security;
-- Intentionally no policies. Only service-role code and SECURITY DEFINER
-- functions may inspect authorization records.

insert into public.authorized_devices (anonymous_id, capabilities, note)
select anonymous_id, array['grant_passes', 'llm_qa', 'llm_limit_override']::text[], note
from public.dev_pass_granters
on conflict (anonymous_id) do update
set capabilities = (
      select array_agg(distinct capability)
      from unnest(
        public.authorized_devices.capabilities ||
        array['grant_passes', 'llm_qa', 'llm_limit_override']::text[]
      ) capability
    ),
    updated_at = now();

-- Manual pass grants now use the shared authorization record. The old table
-- remains temporarily for rollback safety but is no longer authoritative.
create or replace function public.dev_grant_passes(
  p_anonymous_id text,
  p_credits int default 5
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
begin
  if p_credits is null or p_credits < 1 or p_credits > 25 then
    raise exception 'Pass count must be between 1 and 25.';
  end if;

  if not exists (
    select 1
    from public.authorized_devices d
    where d.anonymous_id = p_anonymous_id
      and d.enabled
      and (d.expires_at is null or d.expires_at > now())
      and 'grant_passes' = any(d.capabilities)
  ) then
    raise exception 'This device isn''t allowed to grant passes.';
  end if;

  v_key := 'manual_' || to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

  insert into public.gift_credit_grants (anonymous_id, grant_key, credits)
  values (p_anonymous_id, v_key, p_credits)
  on conflict (anonymous_id, grant_key)
    do update set credits = gift_credit_grants.credits + excluded.credits;

  return public.gift_credit_balance(p_anonymous_id);
end $$;

revoke all on function public.dev_grant_passes(text, int) from public;
grant execute on function public.dev_grant_passes(text, int) to anon;

-- Atomic daily paid-call counter. A reservation happens before contacting a
-- provider and is refunded if that provider call fails. The primary key makes
-- simultaneous requests serialize on the same device/day row.
create table if not exists public.sponsor_chat_daily_usage (
  anonymous_id text not null,
  usage_date date not null,
  quota_bucket text not null check (quota_bucket in ('sponsor_chat', 'spot_check')),
  message_count integer not null default 0 check (message_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (anonymous_id, usage_date, quota_bucket)
);

alter table public.sponsor_chat_daily_usage enable row level security;
-- Intentionally no policies; clients cannot read or modify their counters.

create or replace function public.reserve_sponsor_chat_message(
  p_anonymous_id text,
  p_quota_bucket text default 'sponsor_chat'
)
returns table(allowed boolean, message_count integer, daily_limit integer, is_tester boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := 25;
  v_is_tester boolean := false;
  v_count integer;
  v_today date := (now() at time zone 'utc')::date;
begin
  if p_anonymous_id is null or length(trim(p_anonymous_id)) < 8 then
    return query select false, 0, v_limit, false;
    return;
  end if;

  if p_quota_bucket not in ('sponsor_chat', 'spot_check') then
    raise exception 'Unknown sponsor quota bucket.';
  end if;

  select d.llm_daily_limit, true
    into v_limit, v_is_tester
  from public.authorized_devices d
  where d.anonymous_id = p_anonymous_id
    and d.enabled
    and (d.expires_at is null or d.expires_at > now())
    and 'llm_limit_override' = any(d.capabilities);

  v_limit := coalesce(v_limit, 25);
  v_is_tester := coalesce(v_is_tester, false);

  insert into public.sponsor_chat_daily_usage as usage
    (anonymous_id, usage_date, quota_bucket, message_count, updated_at)
  values (p_anonymous_id, v_today, p_quota_bucket, 1, now())
  on conflict (anonymous_id, usage_date, quota_bucket) do update
    set message_count = usage.message_count + 1,
        updated_at = now()
    where usage.message_count < v_limit
  returning usage.message_count into v_count;

  if v_count is null then
    select u.message_count into v_count
    from public.sponsor_chat_daily_usage u
    where u.anonymous_id = p_anonymous_id
      and u.usage_date = v_today
      and u.quota_bucket = p_quota_bucket;
    return query select false, coalesce(v_count, 0), v_limit, v_is_tester;
  else
    return query select true, v_count, v_limit, v_is_tester;
  end if;
end $$;

create or replace function public.refund_sponsor_chat_message(
  p_anonymous_id text,
  p_quota_bucket text default 'sponsor_chat'
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.sponsor_chat_daily_usage
  set message_count = greatest(message_count - 1, 0), updated_at = now()
  where anonymous_id = p_anonymous_id
    and usage_date = (now() at time zone 'utc')::date
    and quota_bucket = p_quota_bucket;
$$;

revoke all on function public.reserve_sponsor_chat_message(text, text) from public, anon, authenticated;
revoke all on function public.refund_sponsor_chat_message(text, text) from public, anon, authenticated;
grant execute on function public.reserve_sponsor_chat_message(text, text) to service_role;
grant execute on function public.refund_sponsor_chat_message(text, text) to service_role;
