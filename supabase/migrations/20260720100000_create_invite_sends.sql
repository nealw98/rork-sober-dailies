-- Invite Friends — unique-send counting (docs/invite-rewards-design.md §4b).
--
-- One row per (sender, recipient) pair. The recipient is identified ONLY by a
-- SHA-256 hash computed ON THE DEVICE, salted with the sender's anonymous_id —
-- the server never sees a phone number, and the same recipient hashes
-- differently for different senders (no cross-sender correlation). Uniqueness
-- falls out of the primary key: re-texting the same friend upserts the same
-- row, so `count(*) where sender = X` is the sender's unique-send total.
--
-- Counting only — sends are funnel telemetry for the acquisition program
-- (docs/invite-rewards-design.md §4c). The earlier sends-based reward
-- (10 uniques → 3 months) was designed, built, and then RETIRED before
-- deploy in favor of gift-credit rewards; no reward tables ship here.
--
-- Access is service-role only via the invites-report edge function, same
-- posture as gift_codes: RLS enabled, no policies, anon key denied.

create table if not exists public.invite_sends (
  sender_anonymous_id text not null,
  recipient_hash      text not null,               -- 64-char hex, device-computed
  send_count          int  not null default 1,     -- re-sends to the same friend
  first_sent_at       timestamptz not null default now(),
  last_sent_at        timestamptz not null default now(),
  primary key (sender_anonymous_id, recipient_hash)
);

alter table public.invite_sends enable row level security;
-- Intentionally NO policies: only the service role (edge functions) touches
-- this table. Direct anon access is denied.

-- Report + count in one atomic statement. PostgREST upsert can't express
-- "send_count = send_count + 1", hence the function. p_hashes must arrive
-- deduped (a duplicate inside one INSERT..ON CONFLICT errors); the edge
-- function guarantees that. Empty/null p_hashes = pure status read.
create or replace function public.invite_sends_report(p_sender text, p_hashes text[])
returns table(unique_sends int, total_sends int)
language plpgsql
as $$
begin
  if p_hashes is not null and array_length(p_hashes, 1) is not null then
    insert into public.invite_sends (sender_anonymous_id, recipient_hash)
    select p_sender, h from unnest(p_hashes) as h
    on conflict (sender_anonymous_id, recipient_hash)
    do update set send_count = invite_sends.send_count + 1,
                  last_sent_at = now();
  end if;
  return query
    select count(*)::int, coalesce(sum(send_count), 0)::int
    from public.invite_sends
    where sender_anonymous_id = p_sender;
end;
$$;

-- Service-role only, like the table itself.
revoke execute on function public.invite_sends_report(text, text[]) from public, anon, authenticated;
