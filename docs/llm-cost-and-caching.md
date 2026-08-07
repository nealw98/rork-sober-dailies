# LLM cost & caching — Claude vs GPT in this app

Written 2026-08-05; routing is now **selected GPT-5.6 model → Sonnet**, with a
static in-app response if both providers fail.

**Current experiment (2026-08-07):** Luna is the production default and
Sonnet's OpenAI fallback; Terra remains a Dev Console comparison. GPT-5.4 and
GPT-5.4 mini are no longer accepted by the server allowlist. Official list
prices per million tokens are Luna $1 input / $0.10 cached input / $6 output,
versus Terra $2.50 / $0.25 / $15.

Read this before changing engines, before reading the admin Spend panel, and
before anyone concludes "the LLM got expensive." Re-measure with
`node scripts/llm-cache-check.mjs` rather than trusting the numbers below —
provider pricing and caching behaviour both move.

---

## 1. Why caching dominates the bill

Every turn re-sends the whole prompt: the persona (Sam is the biggest, ~1.4k
tokens with the tuning appendix) plus recent history. The variable part — what
the user actually typed — is a rounding error next to it. So the only cost
question that matters is **how much of that fixed prefix you get charged full
price for, again, every turn.**

Caching answers that: the provider keeps the processed prefix and serves a
repeat at a discount. It is a **prefix** match, which is why both request
builders put the static persona first and the user's message last. That layout
is already correct in this repo — don't reorder it.

## 2. The two providers cache very differently

| | Anthropic (Sonnet) | OpenAI (GPT-5.4) |
|---|---|---|
| Mechanism | **Explicit** — `cache_control` breakpoints we set | **Implicit** — automatic, no markup |
| Where | `sponsor-chat/index.ts` — persona prompt + last history message | n/a |
| Minimum | none we hit | 1,024 tokens; **pre-5.6 models want 1,024–2,048 and cache inconsistently in that band** |
| Read price | **0.1×** | disputed: 50% or 90% off (see Open questions) |
| Write price | 1.25× | n/a |
| TTL | shared across all users of that sponsor, stays warm | pre-5.6: evicts after **5–10 min idle** (5.6+: 30 min) |
| Reported as | `usage.cache_read_input_tokens` | `usage.input_tokens_details.cached_tokens` |

The field names differ, and that mattered — see §4.

## 3. Measured, not assumed

Two identical Salty Sam calls per provider, straight through the fn
(`scripts/llm-cache-check.mjs`, 2026-08-05):

```
openai / gpt-5.4 (historical benchmark; no longer routed)
  call 1: in=1808 cached=0            → 1808 full-price-equiv input tokens
  call 2: in=1808 cached=0            → 1808
anthropic / claude-sonnet-4-6
  call 1: in=16  write=2024           → 2546   (cold: writes at 1.25×)
  call 2: in=16  cached=2024          →  218   (warm: reads at 0.1×)
```

**GPT caches nothing here.** Not a reporting gap — we read the right field and
OpenAI genuinely returns `cached_tokens: 0` on a byte-identical repeat seconds
later. Best explanation from the docs: 1,808 tokens sits inside the
1,024–2,048 band where pre-5.6 models cache inconsistently.

Sonnet behaves exactly as designed: pays a 1.25× write once, then reads the
persona back at 0.1× forever.

## 4. The trap this nearly set

Until 2026-08-05 the fn read **only** `cache_read_input_tokens`. OpenAI doesn't
return that key, so it defaulted to `0` and every GPT row landed in
`sponsor_chat_usage` as 100% full-price input. With GPT now primary, that is
the number the Spend panel — and any budgeting off it — would have used.

`cachedInputTokens()` in the fn now normalises both providers into the same
column. **If a third provider is ever added, extend that helper first.**

## 5. What the decision costs

At $2.50/M input and $15/M output for GPT-5.4, on the measured 1,808 in / ~90 out:

| | per turn |
|---|---|
| GPT-5.4 as it actually runs (no caching) | **~0.59¢** |
| GPT if caching worked at 50% off | ~0.36¢ |
| GPT if caching worked at 90% off | ~0.18¢ |
| Sonnet warm (measured, §23.1) | **~0.2¢** |

So GPT runs about **3× a warm Sonnet turn**. Against the 25-message daily cap
that's a worst-case user at roughly **$4–5/mo instead of $2–3** — and almost
nobody hits the cap.

**Accepted knowingly (Neal, 2026-08-05):** GPT won the side-by-side on voice
("smoother and more Sam-like"), Sam's personality cost a week to get right, and
the delta is a few dollars across the whole user base. Voice beat cost.

## 6. Where the levers live

This asymmetry catches people out:

| Lever | Lives | To change | Reaches users |
|---|---|---|---|
| Prompt / persona / playbook | fn `SPONSORS` | `supabase functions deploy sponsor-chat` | instantly, everyone |
| **Routing (which engine)** | **client bundle** | commit + `eas update --channel production` | **only after they take the OTA** |
| Cache breakpoints | fn | deploy | instantly |

Routing is client-side: the app sends `provider`/`model` per request and the fn
honours it against an allowlist. A deploy alone will **not** move engines.

The reflection prompt has one canonical copy: the fn's `reflection` persona.
Prompt changes are deploy-only.

## 7. What we learned (the transferable bits)

- **Instrument before you budget.** The cached-token fix took minutes and
  immediately showed the primary engine caching nothing. A cost decision made
  the day before would have been made on a wrong number.
- **Field names are provider-specific; normalise at the boundary.** One
  `?? null` on the wrong key silently reported a 100% cache miss as fact.
- **Explicit caching beats implicit at low traffic.** Anthropic's breakpoints
  are a guarantee; OpenAI's automatic cache is an opportunity that needs volume
  and a short idle window to pay off. Below a certain traffic level the implicit
  one mostly doesn't fire.
- **Measure call 2, never call 1.** Cold caches make every provider look bad.
- **Know which engine served the reply before judging quality.** The Dev
  Console row labels the active engine so comparisons stay honest.

## 8. Open questions

1. **Is GPT-5.4's cached rate 50% or 90%?** Published tables contradict each
   other ($1.25/M vs $0.25/M against $2.50/M standard). This single number moves
   a cached GPT turn between ~0.36¢ and ~0.18¢ — i.e. between "worse than
   Sonnet" and "parity." **Confirm on OpenAI's own pricing page.** Unresolved.
2. **Can `prompt_cache_key` rescue caching on a pre-5.6 model at 1,808 tokens?**
   Docs call it optional-but-recommended below 5.6, but the threshold
   inconsistency may dominate. **Not attempted.** Cheap to try: add a stable
   per-sponsor key on the OpenAI path, deploy, re-run the script.
3. **Does OpenAI's cache warm up at real launch traffic?** The 5–10 min idle
   eviction means today's near-zero volume is a worst case. Re-run the script a
   week after launch before drawing conclusions.
4. **Would pushing the prefix past 2,048 tokens make caching reliable?** Would
   land it outside the inconsistent band — but padding a prompt to win a
   discount is a bad trade if it dilutes the voice. Untested, low priority.
5. **Should routing move server-side?** It changed three times in two days, and
   each change needs an OTA. If the client stopped sending `provider`/`model`,
   engine choice would become deploy-only and reach every bundle at once.
   Requires fixing the fn's env defaults first — `SPONSOR_CHAT_ANTHROPIC_MODEL`
   still defaults to `claude-haiku-4-5`, the model that neutered Sam.
6. **Should routing be per-surface?** Neal's "more Sam-like" was about the
   sponsor **chat**; the reflection card is Eddie and reads well on both. If the
   voice advantage is Sam-specific, chat and spot-check could route differently
   — at the cost of two code paths to reason about.
7. **Temperature is controlled.** The server pins Luna, Terra, and Sonnet to
   `0.8`; client values are ignored so comparisons remain meaningful.
