-- Drop the old usage_events table + its RLS policies now that analytics has
-- moved to Mixpanel. Run in the Supabase SQL editor when you're ready.
--
-- Before running: this is a hard delete of all historical usage_events rows.
-- If you want to keep the history for reference, export it first (Table
-- Editor → usage_events → Export as CSV), or rename instead of dropping:
--   alter table public.usage_events rename to usage_events_archived_2026_07;

drop table if exists public.usage_events cascade;
