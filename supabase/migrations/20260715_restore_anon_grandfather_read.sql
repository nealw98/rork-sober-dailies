-- Restore the anon grandfather check after the 2026-07-14 security hardening.
--
-- A dashboard-applied migration (20260714162725_701f30f7-9066-4c04-8015-1684d25deb7a,
-- Supabase Security Advisor fixes) enabled RLS on user_profiles with admin-only
-- SELECT policies. The production app (v2.0.1, runtime 2.0.1) checks grandfather
-- status by querying user_profiles directly with the anon key on every launch
-- (hooks/useSubscription.ts checkGrandfatherStatus); zero visible rows reads as
-- "not grandfathered", so every grandfathered user was paywalled.
--
-- Fix: allow anon SELECT, but column-scoped — only anonymous_id (needed for the
-- WHERE filter) and is_grandfathered are readable. sobriety_date, timezone, and
-- location columns stay hidden from the anon key that ships in the app binary.
--
-- Applied to production manually via the SQL editor on 2026-07-15; this file
-- records it so the repo matches the deployed schema.
--
-- Still intentionally NOT restored from the 07-14 hardening:
--   - anon INSERT/UPDATE on user_profiles (lib/sobrietySync.ts upsert fails
--     soft; move it behind an edge function if the sync is worth keeping)
--   - "Public can read daily reflection images" on storage.objects

CREATE POLICY "Anon can check grandfather status"
  ON public.user_profiles FOR SELECT TO anon USING (true);

REVOKE SELECT ON public.user_profiles FROM anon;
GRANT SELECT (anonymous_id, is_grandfathered) ON public.user_profiles TO anon;
