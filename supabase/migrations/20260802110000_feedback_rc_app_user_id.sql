-- RevenueCat app user ID on feedback rows. The RC id ($RCAnonymousID:…) is
-- distinct from our anonymous_id (RC is configured without a custom app user
-- id), and it's the id promotional-entitlement grants target — so support can
-- comp a user straight from a feedback email/row.
alter table public.app_feedback
  add column if not exists rc_app_user_id text;
