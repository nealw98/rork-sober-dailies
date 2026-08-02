# Pass Duration Business Spec — 3-month gift vs 1-month pass

**Written 2026-08-02**, at Neal's request, to re-examine the 3-month pass
duration against a Calm-style 1-month guest pass, with revenue
cannibalization as the central worry. Updates the economics in
`invite-rewards-design.md` §0/§4c to the settled prices and the shipped
implementation. Where this conflicts with older numbers in that doc, this
doc wins.

---

## 1. The question

Every pass gives the recipient **3 months of premium free**. The fear:
some recipients would have paid, so each redeemed pass potentially
displaces revenue — and 3 months displaces 3× more than 1 month. Calm's
guest pass is 30 days. Should ours be?

## 2. Current program, as actually shipped (build 132 RC)

- **Pass = 3 months free.** iOS: Apple offer code (batches 543009 monthly /
  543010 yearly, recipient picks plan on /get), auto-converts to paid at
  the cliff unless cancelled. Android/legacy: SD code → RC promotional
  entitlement `three_month`, does NOT auto-convert (recipient must
  subscribe manually when it lapses).
- **Supply is capped by design:** annual subs earn 5 credits/yr (upfront),
  monthly subs 1 at signup + 1 per 3 paid months (≈4/yr max), founding
  members 5/yr. No purchasing credits (BUY-passes killed 2026-08-01).
- **Prices (live as of 2026-08-02):** $3.99/mo, $19.99/yr. Net of Apple's
  15% small-business cut: **$3.39/mo, $16.99/yr**. These are an INCREASE
  from the $1.99/$9.99 that was actually live through July.
- **Organic funnel already has a 7-day free trial** on the paywall.
- **Eligibility:** Apple blocks ACTIVE subscribers at the redemption sheet
  (including self-redemption). NEW + EXPIRED are eligible — lapsed
  win-back is deliberate.

## 3. Base rates (RC pull 2026-07-20 — small n, refresh before deciding)

| Metric | Value | Caveat |
|---|---|---|
| Subscriber base | ~43 (34 iOS / 8-9 Android) | |
| Monthly churn | 20–27 %/mo (n≈10) | |
| Annual churn | ~0 %/mo | young cohort |
| Trial→paid conversion | 64–77 % | at $1.99/$9.99 — structure, not price, is validated |
| Plan mix at trial | ~2:1 annual | |
| Monthly LTV | ≈ $17–21 | at new prices |
| Annual LTV | ≥ $21.24 yr-1 | |

Blended LTV midpoint used below: **~$25** (conservative vs the design
doc's $32, reflecting the price increase's unknown conversion effect).

## 4. The cannibalization model

### 4.1 Who can actually be cannibalized

A redemption only costs money if the recipient **would have paid without
the pass**. Channels:

1. **Would-be organic subscriber gets a pass instead.** The real channel.
   They still auto-convert at the cliff (iOS), so for them the pass is a
   **deferral**, not a loss — *unless* the free period lowers their
   eventual conversion below what the 7-day trial would have achieved.
2. **Lapsed subscriber win-back.** Eligible on purpose. They were gone;
   any post-cliff revenue is incremental, not cannibalized.
3. **Active subscribers / self-redemption.** Blocked by Apple at the
   sheet. Not a channel on iOS. (Android SD path: server blocks the
   buyer's own ids; a determined second-device self-gift is bounded by
   credit supply.)
4. **Coupon-site leakage.** Bounded by credits-not-codes (a code only
   exists once a specific recipient engages /get) and per-batch expiry
   (2027-01-20).

So the model reduces to channel 1: let **c** = share of redeemers who
would have subscribed organically anyway. Design doc estimate: c ≈
10–20%. Passes travel person-to-person inside recovery networks to
people the app hasn't reached — c at the low end is plausible, but take
20% as the planning number.

### 4.2 Cost per cannibalized redemption, by duration

For a cannibalized **monthly-plan** recipient (net $3.39/mo):

| | 3-month pass | 1-month pass | Δ |
|---|---|---|---|
| Revenue foregone during free period | $10.17 | $3.39 | **$6.78** |

For a cannibalized **annual-plan** recipient: they pay the same $19.99,
just 90 vs 30 days later — a pure deferral worth pennies. /get leads
with annual and trials ran ~2:1 annual, so assume ~60% of redemptions
land on the annual product.

**Expected extra cost of 3-month vs 1-month, per 100 redemptions:**

```
100 redemptions × c(20%) × monthly-share(40%) × $6.78 ≈ $54
```

Add the marginal AI-sponsor API cost of two extra free months
(≤ ~$1/user across the extra window, all 100 users): ≤ ~$100. Call the
total **≈ $150 per 100 redemptions** — the full price of the 3-month
choice over the 1-month choice, per hundred redemptions.

### 4.3 What the extra two months has to buy to break even

The entire bet on 90 days is **cliff conversion**: a daily-habit app
whose habit had 90 days to form, in a culture where "90 days" is itself
the milestone, should convert better at the billing cliff than a 30-day
guest.

Break-even against the ~$150: at ~$25 blended LTV, the 3-month pass
needs to convert just **+6 net-new subscribers per 1,000 redemptions**
(+0.6 pp cliff conversion) more than the 1-month pass would. For scale:
Calm-style 30-day passes in wellness apps convert in the low single
digits to ~10%; any plausible habit effect from 60 extra daily-use days
dwarfs 0.6 pp. And this ignores second-order upside — every converted
recipient becomes a giver with credits of their own.

### 4.4 Absolute exposure is capped by supply anyway

Worst case at today's base: ~31 annual × 5 + monthly credits ≈ **165
credits/yr**. Even at 100% send-and-redeem (unrealistic; expect well
under half), the 3-vs-1 cost difference is 165 × $1.50 ≈ **$250/yr**.
The cannibalization downside is bounded to coffee money at current
scale, while a single incremental conversion covers ~$25 of it. The
program cannot bleed meaningfully until the subscriber base — and
therefore revenue — is 10× bigger, at which point there will be real
cliff data to re-decide with.

## 5. Why Calm's 30 days doesn't map

- **Calm charges $69.99/yr.** A free month of Calm forgoes ~$6 of
  revenue; a free month of Sober Dailies forgoes $1.67. Calm has 10×
  the per-month cannibalization cost, so they buy a shorter window.
- **Calm's guest pass is a marketing sample.** Ours is positioned as a
  member-to-member gift inside recovery culture, where 90 days is a
  sacred number ("90 meetings in 90 days"). "I'm giving you your first
  90 days" is the product story; "here's a free month" is a coupon.
- **Differentiation from the trial:** the organic paywall already gives
  7 free days. A 1-month pass is only 3 extra weeks — it devalues the
  gift ("anyone gets a week just by installing"). 3 months is
  unmistakably a gift.

## 6. What switching to 1 month would cost operationally (pre-launch)

Not free, days before launch:
- Two NEW ASC offers (1-month free, monthly + annual products) + mint new
  code batches + reload `offer_code_inventory` (old 3-month batches
  become dead stock or run in parallel).
- `GIFT_ENTITLEMENT_DURATION` → `monthly` + redeploy gifts-redeem
  (Android/legacy path).
- Copy sweep: /get page, gift SMS template, Pass It On hero, thank-you
  sheets, GiftInfoSheet, gifts-redeem success message — "3 months" is
  everywhere by design.
- Re-run the Android gift E2E (§21.2) and the pending iOS recipient leg.

## 7. Recommendation

**Keep the 3-month pass for launch.** The cannibalization worry is real
but quantitatively small and supply-capped (§4.4), the break-even on the
extra two months is a rounding error of cliff conversion (§4.3), and
the 90-day framing is load-bearing for both the gift's send-motivation
and the brand story (§5). Cutting to 1 month saves at most a few
hundred dollars a year today and risks the one metric the program lives
on — redemptions × cliff conversion.

**But make it falsifiable — instrument and set tripwires:**

1. **Watch (already in place):** ASC redemptions per batch; RC month-4
   retention of the gift cohorts (the program's stated success metrics).
2. **Add one number:** gift-cliff conversion (share of redeemers still
   subscribed 30 days past the cliff), readable from RC cohorts.
3. **Tripwires to revisit duration:**
   - Gift-cliff conversion **< ~15%** after ≥50 redemptions → the
     90-day habit bet isn't paying; test a 1-month batch.
   - Evidence of channel-1 cannibalization at scale — e.g. redemptions
     clustering on devices that had already started a trial → tighten.
   - Subscriber base ~10× (400+) → redo §4.4 with real dollars at stake.
4. **The cheap experiment when a tripwire fires:** mint a parallel
   1-month offer batch and split /get dispensing — ASC reports
   redemptions **per offer**, so 3-vs-1 A/B needs no app changes.

## 8. Numbers to refresh in RevenueCat before finalizing

- Current subscriber count and plan mix (base was 43 on 07-20).
- Trial→paid conversion at the NEW $3.99/$19.99 prices (first real data
  arrives post-launch — the old 64–77% was earned at half the price).
- Monthly churn with a bigger n than ~10.
