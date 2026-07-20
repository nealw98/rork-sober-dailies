# Invite Rewards / Gift Acquisition — Design

**Status:** program design FINAL 2026-07-20 (§0). Sends-counting is built and
undeployed; everything else is design. Sections after §0 are the working
history that produced it — §0 wins on any conflict.

---

## §0 · PROGRAM SUMMARY (authoritative, 2026-07-20)

North star: GROWTH. Gift codes are pure acquisition, not revenue. Success
metrics: offer-code redemptions (ASC aggregate) and month-4 retention (RC).

**PRICING (settled 2026-07-20): $4.99/mo, $24.99/yr — ratio 5.0.** The
$1.99/$9.99 era proved the audience converts on friendly arithmetic (annual
= 5 months of monthly); $3.99/$29.99 had silently diluted the ratio to 7.5.
Growth-era pricing: conversion feeds the credit flywheel (subscribers →
credits → subscribers), ARPU doesn't. Existing subscribers preserved at
their prices; revisit upward for new users once gift-cliff conversion data
lands (strong cliff ≈ evidence for a raise). /get copy does the math out
loud: "3 months free, then $24.99/year — about $2/month."

**Actuals (RC, pulled 2026-07-20; base ~43 subs — small-n, direction over
precision):** platform split ~80/20 iOS/Android (34 vs 8-9). Annual churn
0%/mo (young cohort caveat), annual actives 15→31 in a quarter. Monthly
churn 20-27%/mo (n≈10). At settled prices: monthly LTV ≈ $17-21, annual
≥ $21.24 yr-1. CAVEAT: conversion rates observed (trials 64-77% total,
annual 67-83%, ~2:1 annual trial starts) were achieved at $1.99/$9.99 —
they validate the STRUCTURE (annual-first, ratio steering), not any
specific price; the gift cliff is the first real test of new pricing.
CONSEQUENCES: (1) /get leads with ANNUAL, monthly secondary; (2) Android
recipients (20%): iOS-first with the legacy promo-grant SD-code path as
the /get fallback on Android detect — same 3 free months, no
auto-conversion; revisit Play promo codes if Android grows.

### 1. Giver program & flow
Credits by commitment tier (plan shape, not price paid — legacy $0.99/$1.99
monthly and $9.99 annual get full parity):
  • Annual (any price)      → 5 gift credits per year, granted upfront
  • Monthly (any price)     → 1 credit AT SIGNUP (decided 2026-07-20 — the
    welcome thank-you needs something real to announce), then 1 more per
    3 paid months
ANNOUNCEMENT vs INVENTORY (decided 2026-07-20): the moment that INFORMS the
user of new gifts is the post-subscribe thank-you Alert in PaywallScreen
("Thank you for subscribing — as a thank-you, we've given you N gifts to
pass on" → See your gifts). The Pass It On screen only shows what they HOLD
("You have 5 gifts to give — send them to people who could use 3 free
months"). Receipt voice throughout ("You receive…", never "comes with").
  • Grandfathered v1 (free) → 5/yr, "founding member" — DECIDED YES
    (Neal, 2026-07-20). Deploy with FOUNDING_CREDITS_ENABLED=true. (Their
    self-redemption is an upgrade path, not a leak — no App Store sub.)
No purchasing credits. No free-months rewards to givers — THE GIFT IS THE
REWARD. Once shared, no per-code tracking (ASC aggregates only).

Flow: wallet shows "N gifts to give" → pick contact (existing picker
patterns) → individually addressed text: personal gift message ("3 months
free, from me") + soberdailies.com/get link carrying a share token → credit
consumed. No Apple code exists in the wild yet (credits-not-codes;
just-in-time dispensing).

### 2. Recipient flow
Text from friend → /get (gift message repeated; NO special app onboarding —
the text + /get carry the "gift from your friend" moment) → plan choice
(monthly $3.99 default; annual $29.99 "save" option) → server pops an Apple
offer code from the matching batch → redirect to apps.apple.com/redeem with
code prefilled → Apple's sheet shows exact terms → subscription exists
BEFORE install → install → standard onboarding (Define your program → Today)
→ paywall never renders (the _layout gate checks isPremium after the
subscription load; no code changes needed).
  • Offer config: 3 months free, per-product batches (monthly + annual).
    Eligibility: NEW + EXPIRED subscribers (lapsed = win-back, a gift from a
    friend is the best re-entry); ACTIVE excluded — Apple blocks active
    subscribers (incl. self-redemption) at the sheet.
  • Gift sent to an existing subscriber: Apple's sheet refuses (ineligible).
    The gift is NOT burned — the /get link IS the gift and stays live until
    its code is redeemed; /get says "Already a member? Pass this along to
    someone who needs it." Token binds to its dispensed code, so a
    forwarded link shows the same still-valid code. No credit refund needed.
  • Grandfathered-v1 RECIPIENT edge (rare): Apple sees them as new →
    redeemable → after free months they'd start PAYING for what they had
    free. DECIDED (Neal, 2026-07-20): handle as a support issue — cancel
    the subscription and they fall back to grandfathered premium, since
    isPremium = isEntitled || isGrandfathered (the flags are independent;
    grandfather status survives a subscription coming and going). Caught
    within the free months, nothing was ever charged.
  • Fallback on /get: show raw code + manual App Store redemption steps.
  • Android recipient: TBD pending platform split — /get detects platform;
    fallback is a legacy promo-grant SD code or "iOS first."
  • Later plan change still works: monthly→annual crossgrade takes effect
    when free months end IF both products sit at the same subscription-group
    level in ASC (verify once).

### 3. Implementation plan
Phase 0 — prerequisites (Neal):
  a. RevenueCat: churn, trial→paid conversion, iOS/Android split.
  b. ASC: re-price to $4.99/mo + $24.99/yr (new users; existing preserved);
     verify subscription-group levels; create two 3-months-free offer-code
     offers (monthly + annual, eligibility NEW + EXPIRED); mint test batch
     with expiry; confirm grandfathered-cohort call.
Phase 1 — backend (Supabase): BUILT 2026-07-20, undeployed.
  a. Migration 20260720_gift_credits_program.sql: offer_code_inventory,
     gift_credit_grants (grant-on-read, idempotent keys annual_yN /
     tenure_N / founding_yN), gift_shares (token = the gift artifact),
     dispense_offer_code() atomic pop (SKIP LOCKED; skips codes expiring
     within 7 days), gift_credit_balance().
  b. Edge functions: credits-status (grant-on-read heartbeat),
     credits-share (balance check → token mint, race-compensated),
     get-dispense (public; token-auth; idempotent — plan locks at first
     dispense, forwarded links return the same code).
  c. invites-report (sends telemetry) deploys as already built.
  d. Code load: ASC CSVs (500/offer, batches 543009 + 543010 in
     ~/Downloads) → supabase/scripts/offer-codes-to-sql.py → SQL run
     outside git. AWAITING: which batch = which offer, batch expiry date.
  e. FOUNDING_CREDITS_ENABLED secret gates grandfathered credits (awaiting
     Neal's yes/no); grandfather flag read from user_profiles.
Phase 2 — website (sober-day-reflections repo): BUILT 2026-07-20, verified
  in local browser, uncommitted. /get handles three flows: ?g=<token> (gift
  storefront — yearly-first plan cards at $24.99 "about $2/month" / $4.99,
  dispense via get-dispense, auto-redirect to Apple's redeem URL + manual
  fallback card, Android → SD-code path, invalid/out-of-stock states fall
  back to store buttons + "ask your friend to resend"), ?code=SD-… (legacy
  Pass It On flow unchanged), plain (store buttons). New src/lib/gift.ts
  client. Also fixed the pre-existing broken /favicon.png → apple-touch-icon.
Phase 3 — app: BUILT 2026-07-20, uncommitted. Pass It On rewritten to the
  credits model (hero + Give a gift → pickContact → SMS with token link;
  cancelled composer reuses the pending token so credits never strand;
  Invite friends promoted to a peer button — decided after mockup review).
  Header GiftGlyph badges the count and HIDES at zero (the icon IS the
  notification; Tools tile + Settings row remain the persistent doors).
  PURGED (Neal: "no need to retain purchased codes — I'm the only one"):
  gift-wallet screen, use-gift-wallet hook/provider, pack purchase UI, all
  wallet routes (Tools/Settings/GrowthNudges now point at pass-it-on).
  KEPT: redeem.tsx + gifts-redeem ("Have a code?") — the Android fallback
  mints SD codes that redeem through it. GiftInfoSheet copy rewritten for
  credits. New: lib/creditsService.ts (balance cache + pending-token reuse),
  hooks/use-gift-credits.ts. lib/giftProducts.ts is now dead code (left in
  place). Invite screen: cross-link to Pass It On added.
Phase 4 — QA/launch: real-batch end-to-end (redeem → clean install → verify
  no paywall flash — offer codes have no sandbox); revert
  GIFT_ENTITLEMENT_DURATION to 'three_month' and ship the pending gifts
  edge-function deploy (legacy codes stay honored); monitor ASC redemptions
  + RC month-4 retention.

---

# Working history (superseded where §0 differs)

**Original status note:** design only — nothing implemented. Written 2026-07-19.
**Goal:** reward a user with free premium time when the invites they send from
the Invite Friends screen get results — e.g. *3 opened links → 1 free month*.

Spans three surfaces: the app (`app/(main)/invite.tsx`), the website repo
(`sober-day-reflections` → `soberdailies.com/get`), and Supabase (new table +
edge functions). Reuses the identity and RevenueCat plumbing the Pass It On
gift system already built.

---

## 1. The three signals, ranked by trustworthiness

| Signal | How it's observed | Can the sender fake it? |
|---|---|---|
| **Sent** | Client-side only: expo-sms composer returns `sent` vs `cancelled`. The server never sees the SMS. | Trivially — it's a pure client claim. Add 10 contacts, tap send 10 times (or spoof the API call). No server-side verification is possible. |
| **Opened** | Recipient taps the unique link; the `/get` page fires a JS beacon that marks the token opened. | Easily — every sent link sits in the sender's own Messages thread. Tapping your own links racks up opens. Heuristics (below) blunt but don't eliminate this. |
| **Redeemed / installed** | Recipient takes a real action we already verify server-side (redeeming a code; or first-launch attribution). | Hard — requires a second device/identity taking a verified action. |

Implication for the two candidate reward rules:

- **"3 opens → 1 month, once"** — reasonable. Gameable, but the threshold plus
  a one-time cap bounds the damage at exactly one month per device. Worst case
  is indistinguishable from a marketing credit.
- **"10 sends → 3 months"** — *weaker than it looks.* "Sent" is self-attested,
  so this is effectively "tap a button 10 times → 3 months." If the marketing
  argument is "even gamed sends are word-of-mouth," note that gamed sends
  involve no actual texts. If sends are rewarded at all, keep the reward small
  and one-time, and treat it as a nudge, not an earn.

**Recommended rule:** `3 distinct opened invites → 1 month, once per device`,
with send-count shown in the UI as progress/encouragement but not itself
rewarded. A redemption-based bonus (larger, also one-time) can layer on later
using the same table.

---

## 2. Architecture

### 2.1 New table: `invites`

```sql
create table invites (
  token               text primary key,          -- short random id, e.g. 8 chars from the gift-code alphabet
  sender_anonymous_id text not null,             -- lib/anonymousId.ts identity (same as gift_codes.buyer_anonymous_id)
  created_at          timestamptz not null default now(),
  sent_reported_at    timestamptz,               -- client reported the composer returned 'sent'
  opened_at           timestamptz,               -- first JS-beacon hit; null = never opened
  open_meta           jsonb,                     -- ua / coarse heuristic data from the beacon (no PII)
  create_ip           inet,                      -- request IP at token creation (self-open heuristic)
  open_ip             inet                       -- request IP at first open
);
create index on invites (sender_anonymous_id);
```

And reward bookkeeping (separate so rules can change without touching rows):

```sql
create table invite_rewards (
  sender_anonymous_id text primary key,
  rule                text not null,             -- e.g. 'three_opens_v1'
  granted_at          timestamptz not null default now(),
  rc_app_user_id      text not null,
  rc_result           jsonb
);
```

`invite_rewards` having the sender as **primary key** is the idempotency +
one-time-cap mechanism: a second grant attempt violates the PK and is a no-op.

**Privacy rule:** contact names and phone numbers never leave the device. The
server sees only anonymous tokens. If we later want per-name "Opened" display
in the app, the token→name map lives in AsyncStorage on the sender's device.

### 2.2 Edge functions (mirror the `gifts-*` conventions)

- **`invites-create`** — `{ anonymous_id, count }` → `{ tokens: string[] }`.
  Mints `count` rows. Rate-limited per device (e.g. max 30 tokens/day) so
  token-farming is bounded. Records `create_ip`.
- **`invites-open`** — `{ token }` → 200. Called by the `/get` page beacon.
  Sets `opened_at` if null (first open wins; re-opens ignored). Records
  `open_ip` + user-agent into `open_meta`. Must tolerate garbage tokens
  silently (public endpoint).
- **`invites-status`** — `{ anonymous_id, rc_app_user_id }` →
  `{ sent, opened, rewarded, reward_progress }`. Called by the app to render
  progress. **This is also where the grant fires:** when the rule threshold is
  met and no `invite_rewards` row exists, insert the row (PK enforces
  once-only), then call the existing `grantGiftEntitlement`-style RevenueCat
  REST call with `duration: 'monthly'`. Grant-on-read keeps the trigger
  server-side and needs no cron.

### 2.3 Website (`sober-day-reflections` repo)

`src/pages/Get.tsx` already reads query params for the gift flow. Add: if `i`
param present, `fetch(POST invites-open, { token })` from a `useEffect` after
mount. JS-only beacon (not a server log / redirect) because link-preview
crawlers generally don't execute JS — see §3.

### 2.4 App (`app/(main)/invite.tsx` + new `lib/inviteService.ts`)

- Before the send loop: `invites-create` with `count = invitees.length`;
  pair token *k* with invitee *k*.
- Message becomes per-invitee: `INVITE_MESSAGE` built from
  `getUrl()` + `?i=<token>` (extend `lib/storeLinks.ts#getUrl` to take an
  invite token — it already handles the `code` param the same way).
- After each composer resolves `sent`, report it (`sent_reported_at`) — batch
  at the end of the loop is fine.
- Offline / function-failure fallback: send with the plain untracked link
  rather than blocking the invite flow. Tracking is best-effort; inviting is
  the product.
- Progress UI: a small "2 of 3 friends have taken a look" strip on the invite
  screen fed by `invites-status`; celebration + "1 month added" state when
  `rewarded` flips.

---

## 3. False-positive and gaming notes

- **Link-preview fetches:** WhatsApp/FB fetch URLs server-side to render
  preview cards; iMessage builds the preview on the *sender's* device at
  compose time. The JS beacon filters most of this (crawlers don't run JS),
  but it is not airtight. Acceptable at a 3-open threshold.
- **Self-opens:** `create_ip == open_ip` within a short window is a decent
  "sender opened their own link" heuristic (imperfect under CGNAT — the
  recipient may share a carrier NAT with the sender). Log it in `open_meta`
  and decide later whether to discount; don't hard-block at launch.
- **Bounded blast radius:** one-time cap + per-device rate limit means the
  worst a determined gamer extracts is one month. That is the design's real
  defense; the heuristics are garnish.

---

## 4. Reward delivery — one open decision

`grantGiftEntitlement` (supabase/functions/_shared/gifts.ts) grants an RC
**promotional entitlement**. Two wrinkles:

1. **Already-premium senders:** RC promotional entitlements run *concurrently*
   with a paid subscription — they don't pause billing or extend the paid
   term. A paying subscriber who earns the reward gets effectively nothing.
   Options:
   a. Grant anyway (simplest; reward is symbolic for subscribers).
   b. Detect active premium (`hasActivePremium` already exists) and instead
      mint a **shareable gift code** into their Pass It On wallet — "you're
      already covered; pass this month on." Note `gifts-redeem` blocks
      self-redemption, which is exactly right for this variant.
   c. Defer the grant until premium lapses (needs a cron; most complexity).
   **Recommendation: (b)** — it fits the app's ethos, reuses the wallet
   verbatim, and makes the reward meaningful for every sender. Reward codes
   would be ordinary `gift_codes` rows (maybe with a `source: 'invite_reward'`
   column for accounting).
2. **Duration value:** use `monthly`. Do **not** touch
   `GIFT_ENTITLEMENT_DURATION` (currently `'daily'` for QA with a revert-
   before-launch warning) — the invite reward should pass its own explicit
   duration rather than share that env var.

---

## 4b. Sends-only variant (candidate v1 — much smaller)

Decision under consideration (2026-07-19): if nearly all sends get opened,
open-tracking adds verification but little signal — and verification only
matters for gaming, which the one-time cap already bounds. Counting **unique
sends** instead deletes the entire website surface:

- No `/get` beacon, no tokens in links, no second-repo deploy, and none of
  §3's preview-crawler / self-open concerns.
- App-side: after each composer returns `sent`, report
  `{ anonymous_id, recipient_hash }` where `recipient_hash` is a SHA-256 of
  the normalized phone number **computed on the device** — the server never
  sees a number. Unique constraint on `(sender_anonymous_id, recipient_hash)`
  makes re-sends to the same friend count once.
- Server-side: one edge function (report + status + grant-on-read), the same
  `invite_rewards` PK idempotency, same RevenueCat grant.
- Trade-off: sends are fully self-attested (weakest signal in §1's table).
  Acceptable because the reward is capped at one month per device.
- Rule shape (FINAL 2026-07-19): `10 uniques → 3 months, ONE time per
  device`. Single milestone, once-only via the (sender, milestone) PK on
  invite_rewards. One-time is the gaming backstop: worst case is 3 months per
  device, ever.
- Fulfillment is premium-aware (resolves §4): not-premium senders get the
  direct RC promotional grant (`three_month` — same as a redeemed gift);
  already-premium senders get a standard 3-month Pass It On code minted into
  their gift wallet ("you're covered; pass it on"), which lands immediately
  and dodges the Apple-keeps-billing problem entirely. 3 months was chosen
  partly BECAUSE it matches the wallet denomination — no gift_codes schema
  change.
- Apple/Google offer codes (real billing skip) were explored and set aside:
  strong UX on iOS but per-product code inventories, no sandbox testing, no
  Play equivalent for active subscribers, and multi-code stacking is murky.
  Revisit only if wallet-code fulfillment underwhelms premium senders.

The `invites` table shape still works — add `recipient_hash`, and the
open-tracking columns simply stay null unless/until opens are added later for
a bigger redemption-based bonus.

## 4c. Strategic reframe (2026-07-20): acquisition, not revenue

Direction shift after the sends-counting build: Apple offer codes ("3 months
free, then $X") make each shared code a potential SUBSCRIBER, not a cost. That
reframes Pass It On from a revenue product into an acquisition channel.

**Proposed structure:**
- Annual subscribers → ONE free offer code to give away (once per device —
  the invite_rewards PK pattern). Given once, no per-code tracking; ASC's
  aggregate redemption reporting is the program metric.
- Monthly subscribers → buy codes (packs re-priced downward; a redeemed code
  now has LTV upside instead of being foregone revenue).
- Offer configured NEW-SUBSCRIBERS-ONLY: Apple itself blocks self-redemption.
- Recipient product choice per batch: monthly-product codes (low-friction
  conversion at $3.99/mo) vs annual-product codes (best LTV at $29.99/yr).
  Test both; ASC reports redemptions per offer.

**Economics (2026-07-20 prices: monthly $3.99, annual $29.99; Apple 15%):**
- Monthly LTV ≈ $23–42 (8–15%/mo churn); annual LTV ≈ $38–45 (35–45% yr-2
  renewal). Blended midpoint ≈ $32.
- Offer-code CAC ≈ $0 cash; real costs are AI-sponsor API spend during free
  months (≤ ~$1.50/active user) + sender rewards (~$10 paused revenue if a
  monthly subscriber earns 3 free months) + 10–20% cannibalization haircut.
  Worked case: ~$12–13 per net-new subscriber vs $32 LTV.
- Paid UA at a $3.99 price point costs 1–3× LTV — word-of-mouth at ~zero cash
  is effectively the ONLY acquisition channel where the math works. Optimize
  gift flows for redemptions, not pack revenue (a pack5 sale nets ~$17 once;
  a converted recipient is worth ~$32 plus their own future invites).

**Numbers to pull from RevenueCat before final pricing:** actual monthly
churn, trial→paid conversion, annual renewal rate.

**Decisions (2026-07-20):**
1. Acquisition, not revenue — SETTLED. Pack revenue is no longer a KPI;
   success metrics are offer-code redemptions and month-4 retention.
2. The mix:
   - Recipient offer: 3 MONTHS free (not 30 days) — CONFIRMED. 90 days is
     recovery culture's own milestone; habit formation over 90 days of a
     daily-use app should convert better at the billing cliff, and cash
     cost is ~$0 either way.
   - Giver reward: THE CODE IS THE REWARD — CONFIRMED, with tiered volume
     (2026-07-20): ANNUAL → 5 gift credits per year, granted upfront (the
     perk sells the annual plan: "includes 5 gifts a year" vs $47.88 of
     monthly). MONTHLY → 1 credit per 3 paid months (quarterly retention
     hook — cancel month 2, forfeit an almost-earned gift; caps at 4/yr,
     just under annual's 5). No free-months rewards to givers. The
     sends-based 10→3mo reward is RETIRED; unique-send counting stays as
     funnel telemetry. "Buy more" DROPPED from v1 (reintroduces revenue
     mindset + sell-codes compliance question for an unobserved need).
   - CREDITS, NOT CODES: the wallet shows gift credits; the SMS carries a
     /get link (not a raw code), and the physical Apple offer code is pulled
     from inventory when the RECIPIENT engages on /get. Unshared credits =
     no live codes in the wild to leak or expire.
   - PLAN CHOICE AT /get: an offer code is bound to one product, so a
     monthly-attached code makes annual signup a 2-step (redeem, then
     crossgrade in-app — takes effect at end of free months IF monthly and
     annual sit at the same subscription-group level in ASC; verify).
     Since /get dispenses just-in-time anyway, keep TWO batches (monthly +
     annual offers) and let the recipient pick their plan on /get before
     redemption — monthly prominent as default, annual as "save" option.
     One step for everyone; inventory table carries a product column.
   - Volume analysis: an unredeemed code costs $0 and even a fully
     cannibalized redemption costs only ~$10 deferred revenue (they still
     become a subscriber). The REAL volume risks are coupon-site leakage
     and gift-devaluation — both addressed by commitment-weighted volume
     (committed users in recovery networks place codes best) plus
     just-in-time dispensing. Scarcity cliff is "counted vs uncounted",
     not 1 vs 5.
3. Optimization ranking: (1) redemption rate — personal text + /get page
   clarity + one-tap Apple sheet; (2) month-4 retention — product quality
   plus monthly-vs-annual-product code batches (test both, ASC reports per
   offer); (3) giver cost — already ~$0 by design; (4) cannibalization —
   kept low by scarcity itself. Attribution (onboarding code + Play Install
   Referrer) is the phase-2 upgrade that turns aggregate redemptions into
   per-sender credit, IF givers turn out to need more motivation.

**Open before build:** verify Apple's offer-code terms allow SELLING codes
via IAP (if not: annual perk unaffected; monthly "buys" stay as promo-grant
codes). Decide Android recipient story (platform-split check; /get page can
detect and fall back to a promo-grant code). Signup/subscriber attribution
(onboarding invite-code entry + Play Install Referrer) remains the path to
"N new subscribers → sender reward" if sends-based rewards are retired.

## 5. Rollout order

1. **Supabase:** `invites` + `invite_rewards` tables, three edge functions.
   Deployable and testable with curl before any client ships.
2. **Website:** beacon on `/get`. Backward-compatible (no `i` param → no-op).
   Deploys independently of app review.
3. **App:** token minting + per-invitee links + progress UI. **Blocked until
   the in-progress `3.0.5-redesign` rebase lands** — do not start app-side
   work on the current tree.
4. QA notes: a QA duration override (e.g. `INVITE_REWARD_DURATION` secret) for
   watching the entitlement expire, mirroring the gift-flow QA pattern.

## 6. Open questions

- Confirm the reward rule: 3 opens → 1 month once (recommended), and whether
  a send-count milestone earns anything or is progress-display only.
- Already-premium senders: option (b) above OK?
- Does the reward need copy/UX on the website side ("your friend gets…")? The
  current `/get` page says nothing about the sender; probably fine for v1.

## §0 addendum (2026-07-20, post-launch copy decisions)
- TERMINOLOGY: the unit is a **PASS**, not a "gift" ("You have 5 passes to
  give", "Pass sent", "A pass from a friend" on /get). Resonates with Pass
  It On. Code identifiers/tables keep their gift_* names — copy only.
- Annual-upsell pitch card REMOVED from Pass It On (nobody switches plans to
  give more passes). Possible future release: BUY passes (note: revisit the
  sell-offer-codes compliance question before building).
- Designed moments shipped (thank-you sheet via Today pending-flag handoff,
  gift-sent sheet, give-vs-share rows, hero dots + shimmer) per the Claude
  design handoff bundle.
- SIMPLIFICATION (Neal, 2026-07-20): the multi-select invite screen is
  RETIRED — "Share the app" is now the plain native share sheet
  (lib/shareApp.ts) from Pass It On, Settings, and the growth nudge.
  Client-side unique-send telemetry retired with it; invites-report stays
  deployed but idle. The pass flow (contact pick → personal text) is
  unchanged — it's the personal path; sharing is just spreading the word.
