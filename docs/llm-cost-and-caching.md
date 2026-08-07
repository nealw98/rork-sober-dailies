# LLM cost & caching — Claude vs GPT in this app

Written 2026-08-05, **substantially revised 2026-08-07**. Routing is
**Luna for Eddie / Grace / Spot Check, Terra for Salty Sam, Sonnet as the
cross-provider fallback**, with a static in-app response if both fail. Rork is
gone entirely.

> **If you read the 2026-08-05 version of this doc, its headline is now wrong.**
> It concluded GPT caches nothing and costs ~3× a warm Sonnet turn. That was
> true of **GPT-5.4's implicit cache**. GPT-5.6 supports *explicit* cache
> breakpoints, the function now sets them, and the same measurement re-run on
> 2026-08-07 shows a 99% prefix hit. Luna is now the **cheapest** engine of the
> three — roughly a third of Sonnet.

List prices per million tokens: Luna **$1 in / $0.10 cached / $6 out**, Terra
**$2.50 / $0.25 / $15**, Sonnet **$3 / $0.30 / $15**.

Read this before changing engines, before reading the admin Spend panel, and
before anyone concludes "the LLM got expensive." Re-measure with
`node scripts/llm-cache-check.mjs` rather than trusting the numbers below —
provider pricing and caching behaviour both move, and this doc has already been
wrong once for exactly that reason.

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

## 2. The two providers cache differently — and report it differently

| | Anthropic (Sonnet) | OpenAI (GPT-5.6 Luna / Terra) |
|---|---|---|
| Mechanism | **Explicit** — `cache_control` breakpoints we set | **Explicit** — `prompt_cache_breakpoint` + `prompt_cache_options: {mode:'explicit'}` (5.6 only; 5.4 had implicit-only) |
| Where | `sponsor-chat/index.ts` — persona prompt + last history message | same file — breakpoint right after the persona prompt |
| Routing key | n/a | `prompt_cache_key: sober-dailies:<sponsorId>:persona-v1` keeps every user of a sponsor on one cache route |
| Read price | **0.1×** | **0.1×** |
| Write price | 1.25× | 1.25× |
| Reported as | `usage.cache_read_input_tokens` | `usage.input_tokens_details.cached_tokens` |
| **Counter semantics** | **separate** from `input_tokens` | **subset of** `input_tokens` |

That last row is the one that burns people — see §4.

## 3. Measured, not assumed

Two identical Salty Sam calls per engine, straight through the fn
(`scripts/llm-cache-check.mjs`, re-run **2026-08-07**):

```
openai / gpt-5.6-luna
  call 1: in=1560 cached=0    write=1543 out=76 → 1946 full-price-equiv input
  call 2: in=1560 cached=1543            out=65 →  171
openai / gpt-5.6-terra
  call 1: in=1560 cached=0    write=1543 out=57 → 1946
  call 2: in=1560 cached=1543            out=58 →  171
anthropic / claude-sonnet-4-6
  call 1: in=17   cached=0    write=1731 out=79 → 2181
  call 2: in=17   cached=1731            out=72 →  190
```

**All three engines now cache ~99% of the prefix on a warm turn.** The 2026-08-05
result (`cached_tokens: 0`, every time) was GPT-5.4 relying on OpenAI's
implicit cache, which wouldn't fire reliably at this prompt size. Moving to the
5.6 family and setting an explicit breakpoint fixed it outright.

Note how differently the same fact is reported. Luna warm: `in=1560,
cached=1543` — the cached tokens are **inside** the input count. Sonnet warm:
`in=17, cached=1731` — the cached tokens are **outside** it. Same behaviour,
opposite arithmetic.

## 4. Two traps this has already set

**Trap 1 — the wrong field name (fixed 2026-08-05).** The fn once read **only**
`cache_read_input_tokens`. OpenAI doesn't return that key, so it defaulted to
`0` and every GPT row landed in `sponsor_chat_usage` as 100% full-price input.
`cachedInputTokens()` / `cacheWriteTokens()` now normalise both providers into
the same columns. **If a third provider is ever added, extend those helpers
first.**

**Trap 2 — double-counting the same tokens (fixed 2026-08-07, admin repo).**
Normalising the *values* into one column does not normalise their *meaning*.
The Spend panel priced every row as
`input_tokens×full + cached×0.1 + written×1.25`, which is right for Anthropic
and wrong for OpenAI, where `cached` and `written` are already inside
`input_tokens`. A warm Luna turn came out at ~1,714 full-price-equivalent
tokens instead of 171 — **10× high**. `Admin.tsx` now carries a
`cachedInInput` flag per rate and subtracts before pricing.

Both traps are the same underlying mistake: assuming two providers that report
the same concept report it the same way.

## 5. What the decision costs — recomputed 2026-08-07

Warm turn, from the §3 measurements at list rates:

| engine | full-price-equiv input | output | **per warm turn** |
|---|---|---|---|
| **Luna** ($1 / $6) | 171 | 65 | **~0.056¢** |
| **Terra** ($2.50 / $15) | 171 | 58 | **~0.13¢** |
| **Sonnet** ($3 / $15) | 190 | 72 | **~0.17¢** |

Cold turns (first call after a cache eviction) cost roughly 4–10× a warm one —
Luna's is ~0.24¢ — but they amortise away as soon as a sponsor sees steady
traffic.

**The 2026-08-05 tradeoff has evaporated.** Voice was chosen over cost back
when GPT looked 3× more expensive; on 5.6 with explicit caching Luna is about
**a third of a Sonnet turn**, so the preferred voice is also the cheapest
option. Against the 25-message daily cap, a worst-case Luna user is roughly
**$0.42/mo** — and almost nobody hits the cap.

Sam is the exception worth watching: Terra is 2.5× Luna's input rate and 2.5×
its output rate, so his turns run ~0.13¢. Still under Sonnet, and he carries
the biggest persona prompt, so he benefits most from the cache holding.

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
- **Normalising values is not normalising meaning.** Both providers now land
  in the same columns, and the panel still mispriced OpenAI 10× because
  `cached` is a subset there and a sibling on Anthropic. Ask what a number
  *counts*, not just what it's called.
- **Explicit caching beats implicit, full stop.** Anthropic's breakpoints were
  always a guarantee; OpenAI's implicit cache didn't fire at this prompt size,
  and switching to 5.6's explicit breakpoints took the hit rate from 0% to 99%.
  If a provider offers explicit caching, use it.
- **A conclusion has a shelf life.** "GPT is 3× Sonnet" was correctly measured
  and two days later completely wrong, because the model family changed
  underneath it. Date every cost finding and re-run the script after any engine
  change.
- **Measure call 2, never call 1.** Cold caches make every provider look bad.
- **Know which engine served the reply before judging quality.** The Dev
  Console row labels the active engine so comparisons stay honest.

## 8. Open questions

1. ~~Is GPT-5.4's cached rate 50% or 90%?~~ **Moot** — 5.4 is off the allowlist.
   Luna and Terra both read cached input at 0.1×, measured and priced.
2. ~~Can `prompt_cache_key` rescue caching below 5.6?~~ **Superseded** — we
   moved to 5.6 and set explicit breakpoints instead. 99% hit rate, §3.
3. **Does the cache hold at real launch traffic?** Answered only for
   back-to-back calls. GPT-5.6's window is ~30 min idle; overnight gaps and
   thinly-used sponsors will still pay cold writes. Re-run the script a week
   after launch, and watch the panel's "% cached" figure — if it sits well
   below ~90%, most turns are going cold.
4. ~~Would pushing the prefix past 2,048 tokens help?~~ **Moot** with explicit
   breakpoints. Don't pad prompts for discounts.
5. **Should routing move server-side?** It has changed five times in four days,
   and each change needs an OTA. If the client stopped sending
   `provider`/`model`, engine choice would become deploy-only and reach every
   bundle at once. Requires fixing the fn's env defaults first —
   `SPONSOR_CHAT_ANTHROPIC_MODEL` still defaults to `claude-haiku-4-5`, the
   model that neutered Sam.
6. **Should routing be per-surface?** Partly answered — it already is: Terra
   carries Salty Sam, Luna carries Eddie, Grace and Spot Check. The remaining
   question is whether Sam still needs the pricier engine now that both are
   5.6, or whether Luna holds his voice too. One side-by-side would settle it,
   and would cut his turns from ~0.13¢ to ~0.056¢.
7. **Temperature is controlled.** The server pins Luna, Terra, and Sonnet to
   `0.8`; client values are ignored so comparisons remain meaningful.
8. **Should the panel reconcile against billed spend?** Everything here is our
   own token log × list price. It cannot see free credits, negotiated rates, or
   any call made outside this function. OpenAI's Costs API and Anthropic's
   Admin usage/cost report would give the real invoice figure, at the price of
   two org-level admin keys and an edge function to hold them. **Not built.**
