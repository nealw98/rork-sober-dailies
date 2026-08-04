-- Fresh start for LLM spend tracking (Neal, 2026-08-04): pre-caching rows and
-- the transitional summed-format test rows priced inconsistently with the new
-- per-tier columns. Wipe the log so the panel measures only exact-format rows.
truncate table public.sponsor_chat_usage;
