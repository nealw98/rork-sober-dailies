-- Restore anon LIST on the daily-reflection-images bucket.
--
-- Found 2026-07-27: the app's rotating Daily Reflection hero
-- (hooks/useReflectionHeroImage.ts) builds its pool by LISTING
-- daily-reflection-images/daily-reflections with the anon key — and that list
-- now returns 0 rows, while the files exist (authenticated list sees them) and
-- individual objects still serve (public bucket GET = 200). Net effect: any
-- FRESH INSTALL shows the bundled fallback photo forever (first seen on
-- Android build 130); long-installed devices coast on the pool they persisted
-- before the policy vanished, which is why iOS looked fine.
--
-- Listing storage.objects always goes through RLS regardless of the bucket's
-- public flag, so the anon SELECT policy below is required for list() to
-- return rows. Its disappearance fits the dashboard-advisor pattern documented
-- in 20260724185725_lovable_dashboard_applied.sql and
-- 20260715_restore_anon_grandfather_read.sql.
--
-- Scope: read-only visibility of object metadata in this ONE public-content
-- bucket (the images are already world-readable by URL). No user data lives
-- in this bucket.

drop policy if exists "anon_list_daily_reflection_images" on storage.objects;

create policy "anon_list_daily_reflection_images"
on storage.objects for select
to anon
using (bucket_id = 'daily-reflection-images');
