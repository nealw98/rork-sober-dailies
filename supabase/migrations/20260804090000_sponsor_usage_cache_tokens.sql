-- Prompt caching landed in sponsor-chat (2026-08-04). From now on
-- input_tokens logs ONLY the full-price uncached input; the cached tiers get
-- their own columns so the admin spend panel can price each at its real rate
-- (cache read = 0.1x input price, cache write = 1.25x). Null on pre-caching
-- rows — treat as 0.
alter table public.sponsor_chat_usage
  add column if not exists cache_read_tokens integer,
  add column if not exists cache_creation_tokens integer;
