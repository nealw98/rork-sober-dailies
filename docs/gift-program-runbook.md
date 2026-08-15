# Gift / Pass program — operations runbook

How to tell whether the pass program is healthy in production, and how to fix
the things that can go wrong. Written 2026-07-24, when the decision was made
**not** to build a parallel test environment: the program shares the live
RevenueCat project, the live App Store and Google Play, and two pools of real
store offer codes, so observability plus a small blast radius replaces a
staging rig.

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
   ├── iPhone visitor  → pop yearly Apple code, bind to token → App Store
   └── Android visitor → pop yearly Google code, bind to token → Google Play
                                      │
                                      ▼
                     3 months free → annual store renewal
```

Two properties drive everything below:

- **Dispense is atomic and permanently binding.** First fulfillment wins and
  every later call returns the same store code. A wrong-platform assignment
  therefore requires support recovery.
- **Both branches consume finite store inventory.** No pass grants a RevenueCat
  entitlement directly. Every recipient accepts an annual subscription through
  Apple or Google and sees its renewal price before confirmation.

### Tables

| Table | Grain | Key columns |
|---|---|---|
| `gift_credit_grants` | one row per earn event | `anonymous_id`, `grant_key`, `credits`, `granted_at` |
| `gift_shares` | one row per credit spent | `token`, `sender_anonymous_id`, `android_gift_code`, `created_at` |
| `offer_code_inventory` | one row per store code | `code`, `platform`, `product`, `batch_id`, `expires_at`, `share_token`, `dispensed_at` |
| `gift_codes` | retired SD-code history only | no new rows after 2026-08-15 |

`grant_key` values: `annual_y1…` (5/yr), `tenure_3`, `tenure_6…` (1 per 3 paid
months), `monthly_signup` (1, at signup), `founding_y1` (5, grandfathered v1).

---

## 2. Health checks

### 2.1 Inventory level — run this weekly

Dispense fails with `out_of_stock` when a product's pool is dry, and the pop
query skips anything expiring within 7 days.

```sql
select
  platform,
  product,
  count(*) filter (where dispensed_at is null
                     and (expires_at is null or expires_at > now() + interval '7 days')) as available,
  count(*) filter (where dispensed_at is null
                     and expires_at <= now() + interval '30 days')                       as expiring_30d,
  count(*) filter (where dispensed_at is not null)                                       as dispensed,
  min(expires_at) filter (where dispensed_at is null)                                    as next_expiry
from offer_code_inventory
group by platform, product
order by platform, product;
```

`available` is the real blast-radius control. Keeping the loaded pool small is
the throttle — a batch of 25 caps the worst case at 25 codes.

### 2.2 Store codes dispensed but apparently never redeemed

This is the signature of an abandoned redemption or wrong-platform assignment.
The `/get` UA gate prevents desktop assignment and selects the correct pool.

```sql
select i.code, i.platform, i.product, i.dispensed_at, s.sender_anonymous_id
from offer_code_inventory i
join gift_shares s on s.token = i.share_token
where i.dispensed_at < now() - interval '48 hours'
order by i.dispensed_at desc;
```

**Caveat: the database cannot confirm redemption.** Treat this list as
*candidates* and confirm against RevenueCat/store reporting before recovery.

### 2.3 Retired Android SD-code history

This query is historical only. `gifts-redeem` returns 410 and `get-dispense`
does not mint new SD codes.

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

### 3.1 A recipient is stuck with a dead store code

The case from §2.2: a token is bound to a store code the recipient can't redeem.

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

If redemption status is uncertain, do not recycle the code. Leave it dispensed,
unbind the pass only with a support-reviewed replacement procedure, and accept
one lost code rather than poisoning the available pool.

### 3.2 Refund a spent credit

Balance is `sum(grants) − count(shares)`, so refunding means deleting the share
row. **Unbind any dispensed code first** (§3.1) or you orphan it.

```sql
delete from gift_shares where token = '<token>';
```

### 3.3 Top up inventory

Generate yearly one-time codes in the relevant store and export them. Convert
Apple batches with `supabase/scripts/offer-codes-to-sql.py`; convert Google
batches with `supabase/scripts/google-promo-codes-to-sql.py`. Generated SQL
contains live codes and must never be committed.

---

## 4. Live levers

No app-store round trip needed for any of these except where noted.

| Lever | Where | Effect |
|---|---|---|
| `PASSES_ENABLED` | `lib/creditsService.ts` | Master kill switch for earning/sending. Balance reads 0, no token mints, no thank-you. Client-side → ships by **OTA**. |
| `FOUNDING_CREDITS_ENABLED` | Supabase env (default `true`) | Turns off the 5-credit grandfathered grant. Server-side, instant. |
| `dev_pass_granters` | Supabase table | Device ids allowed to hand-grant passes (§7). Empty = nobody. Server-side, instant. |
| Inventory by platform | `offer_code_inventory` | Finite annual-offer pools; monitor both. |

Server-side gates already in place, for reference: sandbox subscriptions earn
no credits, and no credits accrue while a subscriber is riding a free/intro
period (`_shared/credits.ts`). Both exist so testers can't mint passes that
dispense real codes.

---

## 5. Testing without a separate environment

**The `/get` branches are free to inspect** — the page renders its gate before
anything dispenses, so opening a link on desktop, iPhone and Android and looking
at what appears costs nothing.

**Redemption tests consume codes.** Test one fresh account per platform through
the complete native purchase sheet. Verify three free months, the annual renewal
amount, RevenueCat entitlement attachment, cancellation, and return to the app.

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

- [ ] `/get` UA gate deployed (web repo `sober-day-reflections` — iPhone →
      yearly Apple pool, Android → yearly Google pool, everything else → open
      on your phone).
- [ ] Website published at `soberdailies.com` — the app's share links point there.
- [ ] Active yearly offer-code inventory loaded for both platforms.
- [ ] **`supabase functions deploy credits-status credits-share`** — the earn
      gates (sandbox, free-period, promotional) live in `_shared/credits.ts`
      and only apply once deployed. Discovered 2026-07-27: the deployed
      functions predated the 7/22 gates, and a TestFlight sandbox yearly earned
      a real `annual_y1` grant. Verify the last-deployed date in the dashboard
      is AFTER the latest `_shared/credits.ts` change.
- [ ] `PASSES_ENABLED` flipped to `true` and OTA'd (this is the actual go-live).

Codes sitting in either console are invisible to `get-dispense`; only imported
rows can be dispensed. Watch `next_expiry` (§2.1). Apple one-time batches need
roughly six-month replenishment; Google promotions can run for up to one year.

---

## 7. Manual grants — giving yourself passes

Everything above assumes passes are *earned*. For promotion you hand them out
yourself: the **Grant 5 passes** button in the Developer Console writes one row
into `gift_credit_grants` exactly the way an annual renewal does, with no
subscription behind it — `founding_y1` is the precedent. Keys are stamped
`manual_<utc iso>`, a shape `computeEarnedGrants` never produces, so
grant-on-read can neither collide with nor re-trigger them. From there the
passes are indistinguishable from earned ones: same balance math, same send
flow, same recipient experience.

There is no edge function and nothing to deploy — the button calls the
`dev_grant_passes` Postgres RPC (migration `20260727100000`).

**The safeguard:** the console is only hidden (long-press the version number),
not locked, and the anon key ships in the app bundle. So the guard is
server-side: `dev_pass_granters` is an allowlist table the anon key can't read
or grow, and the RPC refuses any device not in it. On anyone else's phone the
button answers "This device isn't allowed to grant passes." Empty table =
nobody can grant.

### 7.1 One-time setup — a single SQL paste

Paste the whole of `supabase/migrations/20260727100000_dev_pass_grants.sql`
into the Supabase SQL editor and run it, then allowlist your device:

```sql
insert into public.dev_pass_granters (anonymous_id, note)
values ('<your device id>', 'Neal — iPhone')
on conflict (anonymous_id) do nothing;
```

Your device id is in the Developer Console → THIS DEVICE → **Device ID** (tap
the row to copy). On a build that predates that row: Settings → tap the version
number 7× → Support ID modal. Same value.

### 7.2 Granting

Settings → **long-press the version number** → GIFT PASSES → **Grant 5 passes**.

The badge updates with your new balance, and the grant automatically unsuspends
passes on this device (the "Passes on this device" switch flips itself on) —
so the passes are immediately visible and sendable in Pass It On, even while
`PASSES_ENABLED` keeps the program suspended for everyone else. Tap again for
5 more. That is the whole flow.

### 7.3 From SQL — other devices, bigger numbers

Allowlist another phone (its id from the same console row on that phone):

```sql
insert into public.dev_pass_granters (anonymous_id, note)
values ('<other device id>', 'whose phone');
```

Grant any allowlisted device from the dashboard (cap 25 per call, returns the
new balance):

```sql
select public.dev_grant_passes('<device id>', 25);
```

### 7.4 Reading grants back

```sql
select anonymous_id, grant_key, credits, granted_at
from gift_credit_grants
where grant_key like 'manual_%'
order by granted_at desc;
```

### 7.5 What to know

- **Grants are permanent** — no revoke button, by design. To undo one, delete
  its row by `grant_key`.
- **Granting and sending consume nothing.** Sending spends a credit and mints a
  token; a store code only leaves inventory when the recipient actually taps
  the redemption button on `/get` (§1). An ignored link costs nothing —
  that is the `never_claimed` bucket in §2.4.
- **The recipient path is annual-only:** iPhone → Apple yearly offer code,
  Android → Google yearly promo code; both renew annually after 3 free months.
- Do not distribute raw codes outside the pass flow; the private token is the
  control that keeps one store code attached to one pass.
