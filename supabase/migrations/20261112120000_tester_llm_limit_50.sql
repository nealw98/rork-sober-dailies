-- Developer Console devices get a 50/day AI allowance per bucket (sponsor chat
-- and Spot Check each), double the regular 25.
--
-- reserve_sponsor_chat_message only lifts the 25/day cap for authorized
-- devices that carry 'llm_limit_override', and then caps them at
-- llm_daily_limit. A device enrolled for the Dev Console without that
-- capability still hit 25. Give every enabled device the capability at 50/day,
-- and make 50 the default for future enrollments.

alter table public.authorized_devices
  alter column llm_daily_limit set default 50;

update public.authorized_devices
set capabilities = (
      select array_agg(distinct capability)
      from unnest(capabilities || array['llm_limit_override']::text[]) capability
    ),
    llm_daily_limit = 50,
    updated_at = now()
where enabled;
