# Gift / Pass program — operations runbook

How to tell whether the pass program is healthy in production, and how to fix
the things that can go wrong. Written 2026-07-24, when the decision was made
**not** to build a parallel test environment: the program shares the live
RevenueCat project, the live App Store, and one pool of real Apple offer codes,
so observability plus a small blast radius replaces a staging rig.

Everything here is service-role SQL — run it in the Supabase dashboard SQL
editor. All four tables have RLS on with no policies, so the anon key can't
read them and neither can a client.

---

## 1. The pipeline, in one pass

```
giver's subscription (RevenueCat)
   │  grant-on-read, every credits-status call
   ▼
gift_credit_grants ────────────── balance = sum(credits) − count(shares)
   │  spending a credit
   ▼
gift_shares (token)  ──── the SMS carries soberdailies.com/get?g=<token>
   │
   ├── iPhone visitor  → offer_code_inventory: pop one Apple code, bind to token
   │                     → recipient redeems in the App Store → real subscription
   │
   └── Android visitor → gift_codes: mint SD-XXXX-XXXX under the SENDER's id
                         → recipient enters it in-app → 3-month RC promo grant
```

Two properties drive everything below:

- **Dispense is atomic and permanently binding.** First fulfillment wins; every
  later call on the same token returns the same result regardless of what is
  asked for (`get-dispense/index.ts`). This is deliberate — it stops a forwarded
  link collecting both an Apple code and an SD code — but it means a wrong turn
  cannot be undone by the recipient.
- **Only the Apple branch is destructive.** An SD code is a platform-agnostic
  RevenueCat promotional grant and can be minted freely. An Apple offer code is
  finite, paid for, and gone once dispensed.

### Tables

| Table | Grain | Key columns |
|---|---|---|
| `gift_credit_grants` | one row per earn event | `anonymous_id`, `grant_key`, `credits`, `granted_at` |
| `gift_shares` | one row per credit spent | `token`, `sender_anonymous_id`, `android_gift_code`, `created_at` |
| `offer_code_inventory` | one row per Apple code | `code`, `product`, `batch_id`, `expires_at`, `share_token`, `dispensed_at` |
| `gift_codes` | one row per SD code | `code`, `product_id`, `status`, `buyer_anonymous_id`, `redeemed_at`, `redeemer_anonymous_id` |

`grant_key` values: `annual_y1…` (5/yr), `tenure_3`, `tenure_6…` (1 per 3 paid
months), `monthly_signup` (1, at signup), `founding_y1` (5, grandfathered v1).

---

## 2. Health checks

### 2.1 Inventory level — run this weekly

Dispense fails with `out_of_stock` when a product's pool is dry, and the pop
query skips anything expiring within 7 days.

```sql
select
  product,
  count(*) filter (where dispensed_at is null
                     and (expires_at is null or expires_at > now() + interval '7 days')) as available,
  count(*) filter (where dispensed_at is null
                     and expires_at <= now() + interval '30 days')                       as expiring_30d,
  count(*) filter (where dispensed_at is not null)                                       as dispensed,
  min(expires_at) filter (where dispensed_at is null)                                    as next_expiry
from offer_code_inventory
group by product
order by product;
```

`available` is the real blast-radius control. Keeping the loaded pool small is
the throttle — a batch of 25 caps the worst case at 25 codes.

### 2.2 Apple codes dispensed but apparently never redeemed

**This is the signature of the wrong-platform burn** — an Android or desktop
visitor who reached the plan cards, popped a real code, and couldn't use it.
The `/get` UA gate (web repo, `detectGiftPlatform`) is what prevents it; this
query is how you find out the gate has a hole.

```sql
select i.code, i.product, i.dispensed_at, s.sender_anonymous_id
from offer_code_inventory i
join gift_shares s on s.token = i.share_token
where i.dispensed_at < now() - interval '48 hours'
order by i.dispensed_at desc;
```

**Caveat: the database cannot confirm redemption.** Apple does not report an
offer-code redemption back into `offer_code_inventory` — the only evidence is a
new subscriber in RevenueCat whose current period type is an offer/promotional
period, around that timestamp. So treat this list as *candidates* and confirm
against the RevenueCat dashboard. A dispensed code with no matching RC
subscriber a couple of days later is a probable burn.

### 2.3 Android side — minted vs redeemed

Unlike the Apple path, this one is fully observable, because redemption goes
through our own `gifts-redeem` function.

```sql
select
  count(*)                                        as minted,
  count(*) filter (where status = 'redeemed')     as redeemed,
  count(*) filter (where status = 'available'
                     and created_at < now() - interval '7 days') as stale_unredeemed
from gift_codes
where product_id = 'gift_android_fallback';
```

`stale_unredeemed` climbing means recipients are getting codes and not entering
them — a `/get` instructions problem, not a backend one.

### 2.4 Funnel: minted → opened → claimed

```sql
select
  count(*)                                                              as tokens_minted,
  count(*) filter (where android_gift_code is not null)                 as claimed_android,
  count(*) filter (where exists (select 1 from offer_code_inventory i
                                 where i.share_token = gift_shares.token)) as claimed_apple,
  count(*) filter (where android_gift_code is null
                     and not exists (select 1 from offer_code_inventory i
                                     where i.share_token = gift_shares.token)) as never_claimed
from gift_shares;
```

`never_claimed` is expected to be non-trivial — links get sent and ignored. A
sudden spike is worth a look at `/get` (deployed? erroring? gate too strict?).

### 2.5 Top credit earners — abuse sniff test

```sql
select g.anonymous_id,
       sum(g.credits)                                                     as granted,
       (select count(*) from gift_shares s
         where s.sender_anonymous_id = g.anonymous_id)                    as spent
from gift_credit_grants g
group by g.anonymous_id
order by granted desc
limit 20;
```

Grants are keyed and idempotent, so double-granting shouldn't be possible;
this is here to notice if it happens anyway.

---

## 3. Recovery

### 3.1 A recipient is stuck with a dead Apple code

The case from §2.2: token bound to an Apple code the recipient can't redeem.

```sql
-- 1. Find the binding.
select i.code, i.share_token, i.dispensed_at
from offer_code_inventory i
where i.share_token = '<token>';

-- 2. Return the code to the pool and free the token.
update offer_code_inventory
   set share_token = null, dispensed_at = null
 where share_token = '<token>';
```

The token is now unbound, so the recipient can reopen the `/get` link and claim
correctly. **Only do this once you're confident the code was never redeemed** —
recycling a redeemed code puts a dud back in the pool. Confirm in RevenueCat
first (see §2.2).

If you'd rather not gamble on that, leave the code out of the pool and just
hand the recipient an SD code instead (§3.2). One lost code beats a poisoned
pool.

### 3.2 Mint an SD code by hand

Works for any recipient on any platform — it grants through RevenueCat, not the
store. Use it for support recovery, or to make someone whole after §3.1.

```sql
insert into gift_codes (code, product_id, buyer_anonymous_id)
values ('SD-XXXX-XXXX', 'gift_manual_support', '<sender_anonymous_id or your own>');
```

Pick a code in the existing shape. The recipient enters it under "Have a code?"
on the paywall and gets the standard 3-month promotional grant.

Note `gifts-redeem` blocks **self-redemption** by `anonymous_id`, so don't file
it under the same device that will redeem it.

### 3.3 Refund a spent credit

Balance is `sum(grants) − count(shares)`, so refunding means deleting the share
row. **Unbind any dispensed code first** (§3.1) or you orphan it.

```sql
delete from gift_shares where token = '<token>';
```

### 3.4 Top up inventory

Generate a fresh batch in App Store Connect, export the CSV, and insert it in
the shape of `supabase/migrations/20260720100002_load_offer_codes.sql`
(`code, product, batch_id, redeem_url, expires_at`). The `redeem_url` is the
full `apps.apple.com/redeem?ctx=offercodes&id=6749869819&code=…` from the CSV.

---

## 4. Live levers

No app-store round trip needed for any of these except where noted.

| Lever | Where | Effect |
|---|---|---|
| `PASSES_ENABLED` | `lib/creditsService.ts` | Master kill switch for earning/sending. Balance reads 0, no token mints, no thank-you. Client-side → ships by **OTA**. |
| `FOUNDING_CREDITS_ENABLED` | Supabase env (default `true`) | Turns off the 5-credit grandfathered grant. Server-side, instant. |
| `DEV_GRANT_ANONYMOUS_IDS` | Supabase env (default **unset**) | Who may hand-grant passes (§7). Unset = nobody. Server-side, instant. |
| `GIFT_ENTITLEMENT_DURATION` | Supabase env (default `three_month`) | Length of every gift grant. Server-side, instant. Currently **unset** — do not set it for testing and forget. |
| Inventory size | `offer_code_inventory` | The real throttle. Load small batches. |

Server-side gates already in place, for reference: sandbox subscriptions earn
no credits, and no credits accrue while a subscriber is riding a free/intro
period (`_shared/credits.ts`). Both exist so testers can't mint passes that
dispense real codes.

---

## 5. Testing without a separate environment

**Free rehearsal — the Android leg.** Sender on a grandfathered device (which
earns 5 founding credits with no purchase), recipient on Android. Exercises
credit spend, token mint, `/get`, dispense, in-app redemption, the RC grant and
its expiry. Burns zero Apple codes, involves no store, needs no cleanup. This is
the one to run repeatedly.

**The `/get` branches are free to inspect** — the page renders its gate before
anything dispenses, so opening a link on desktop, iPhone and Android and looking
at what appears costs nothing.

**The paid test — the Apple leg.** Only provable with a real, non-sandbox
receipt, because the credits server skips sandbox subs by design. Buy the
monthly yourself (`monthly_signup` grants a credit immediately, so there's no
waiting), send a pass, redeem it on a second Apple ID, then cancel. Costs one
month plus one real offer code. Worth doing once, deliberately.

⚠️ Unverified: Apple offer codes are believed to be redeemable only in
**production**, not by sandbox Apple accounts. Confirm against Apple's docs
before planning any sandbox-based test of the iOS recipient path.

**Device reset.** The Developer Console's "Reset Subscription State" clears the
anonymous ID and onboarding flags and logs RevenueCat out, which drops
grandfather status and entitlement — but it does **not** clear the App Store
receipt (an Apple-ID-level fact no app control can touch) and does **not** clear
local content like dailies and journal entries. For a genuinely fresh recipient
you need an Apple ID that has never subscribed.

---

## 6. Before the program goes live

- [ ] `/get` UA gate deployed (web repo `sober-day-reflections` — `detectGiftPlatform`,
      iPhone → Apple flow, Android → SD code, everything else → "open this on
      your phone"). Without it, Android and desktop visitors burn Apple codes.
- [ ] Website published at `soberdailies.com` — the app's share links point there.
- [ ] `GIFT_ENTITLEMENT_DURATION` confirmed unset (or `three_month`).
- [ ] Small offer-code batch loaded, not the full pool.
- [ ] `PASSES_ENABLED` flipped to `true` and OTA'd (this is the actual go-live).

**Right after go-live:** the small loaded pool is a pre-launch blast-radius
throttle, not a steady state. Generate a real batch in App Store Connect (~5k —
Apple's cap is 1M redemptions/year, so the number is not the constraint) and
load it with `supabase/scripts/offer-codes-to-sql.py`. Codes sitting in ASC are
invisible to `get-dispense`; only what's in `offer_code_inventory` can be
dispensed. Watch `next_expiry` (§2.1) — a batch expires whether it was redeemed
or not, and the pop query skips anything within 7 days of expiring.

---

## 7. Manual grants — giving yourself passes

Everything above assumes passes are *earned*. For promotion you need to hand
them out yourself, which the `credits-grant` edge function does: it writes one
row into `gift_credit_grants` exactly the way an annual renewal does, without a
subscription behind it. `founding_y1` is the precedent — a grandfathered user
gets 5 credits off a profile flag, no purchase, no paywall.

Grant keys are `manual_<iso timestamp>`. `computeEarnedGrants` can never produce
that shape, so grant-on-read (`upsert … ignoreDuplicates`) leaves these rows
untouched forever. Balance stays `sum(grants) − count(shares)`; the share flow,
`/get`, and dispense can't tell a hand grant from an earned one.

### 7.1 One-time setup

**a. Get your device's ID.** Developer Console → THIS DEVICE → **Device ID** →
tap the row to copy. That string is your `anonymous_id`.

On a build that predates this section, use the older gesture instead: Settings →
tap the version number 7× → the Support ID modal → tap to copy. Same value, and
it's the one to use for the very first setup, since the console row only appears
after the OTA in step (d).

**b. Add it to the allowlist.** Supabase dashboard → Project Settings → Edge
Functions → Secrets → Add new secret:

```
DEV_GRANT_ANONYMOUS_IDS = <your support id>
```

Comma-separate for more than one device, no spaces needed. **The function fails
closed** — with this secret unset every grant is refused, which is the correct
production posture. It matters because the anon key ships inside the app bundle,
so the endpoint is reachable by anyone who finds it; the allowlist is the only
thing standing between that and free passes.

**c. Deploy the function.** From the repo root:

```bash
supabase functions deploy credits-grant
```

If it says "Access token not provided," run `supabase login` first — it opens a
browser. The dashboard's Edge Functions screen can also deploy a pasted file if
the CLI is being difficult.

**d. OTA the app** so the Developer Console has the new section.

### 7.2 Making passes

In the app: Settings → **long-press the version number** → Developer Console →
**GIFT PASSES**.

1. **Grant 1 pass** / **Grant 5 passes** — each tap writes a new ledger row. The
   balance badge updates in place. Tap 5 five times for 25.
2. **Passes on this device** — turn this on. `PASSES_ENABLED` is `false` for
   launch, which forces every balance to 0, so without this switch you'd hold
   real passes and see an empty Pass It On screen. The switch unsuspends passes
   on this device only, stored in AsyncStorage, read nowhere else. It does
   nothing to any other install and does not touch the global flag.
3. Send them: Tools → Pass It On (or the gift badge in the nav header). Normal
   flow from there — pick a contact, the SMS carries the `/get` link.

Server-side caps: 1–25 credits per call, and the device must be allowlisted.

### 7.3 Reading them back

```sql
select anonymous_id, grant_key, credits, granted_at
from gift_credit_grants
where grant_key like 'manual_%'
order by granted_at desc;
```

Hand grants vs earned, per device:

```sql
select anonymous_id,
       sum(credits) filter (where grant_key like 'manual_%')     as hand_granted,
       sum(credits) filter (where grant_key not like 'manual_%') as earned,
       (select count(*) from gift_shares s
         where s.sender_anonymous_id = g.anonymous_id)           as spent
from gift_credit_grants g
group by anonymous_id
order by hand_granted desc nulls last;
```

### 7.4 What to know before sending

- **There is no revoke button.** Deliberate — the ledger is append-only and the
  console can't take a grant back. To undo one, delete the row by `grant_key`.
- **Sending to an iPhone still burns a real Apple offer code**, because a hand
  grant only changes where the *credit* came from; the recipient's path through
  `/get` is unchanged (§1). Granting 25 passes is free. Sending 25 costs 25
  codes out of `offer_code_inventory`.
- **The recipient's 3 months come from wherever `/get` sends them** — Apple's
  offer code on iPhone (auto-converts to paid), an SD code on Android (lapses).
- If you want codes to hand out *without* the send flow — a link in a podcast
  description, codes on a flyer — this is the wrong tool. Use an App Store
  Connect custom offer code, or mint SD codes directly (§3.2).
