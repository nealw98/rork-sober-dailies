# Gift / Pass program — operations runbook

How to tell whether the pass program is healthy in production, and how to fix
the things that can go wrong. Written 2026-07-24, when the decision was made
**not** to build a parallel test environment: the program shares the live
RevenueCat project, the live App Store and Google Play, and a pool of real Apple
offer codes, so observability plus a small blast radius replaces a staging rig.

Last revised **2026-08-16** for the Android change in §1 — passes now ride a
gated offer on the annual Play subscription instead of a promo-code pool.

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
   │
   └── Android visitor → hand off into the app (no code minted)
                            │  intent://pass?g=<token>, Play listing +
                            │  install referrer when the app is absent
                            ▼
                         app claims the token: gift_shares.android_gift_code
                            │  = 'play:<rc_app_user_id>'
                            ▼
                         gated `pass-3mo` offer on the annual product
                                      │
                                      ▼
                     3 months free → annual store renewal
```

**The two platforms reach the same place by different means.** Apple spends a
one-time offer code from `offer_code_inventory`. Android spends nothing: the
three free months are a *gated offer attached to the annual subscription
product itself*, so Play bills the purchase and no code exists to lose, expire
or recycle. Changed 2026-08-16 (`7e8b9282`); before that Android popped a Google
promo code from the same table.

Three properties drive everything below:

- **Apple dispense is atomic and permanently binding.** First fulfillment wins
  and every later call returns the same store code. A wrong assignment therefore
  requires support recovery (§3.1).
- **Android claim is atomic and binds a person, not a code.** The first
  RevenueCat app user to claim a token owns it; anyone else opening the same
  link gets `already_claimed`. The claim is written *before* the Play sheet
  opens, so a cancelled purchase leaves the marker in place — that same app user
  can retry indefinitely, a different one cannot (§3.1).
- **No pass grants a RevenueCat entitlement directly.** Every recipient accepts
  an annual subscription through Apple or Google and sees its renewal price
  before confirmation. This is what the retired SD-code path did *not* do, and
  the reason it was retired.

### Offer IDs

Both live in `lib/subscriptionOffers.ts`, which is the only place they appear:

| Constant | Play offer ID | Used by |
|---|---|---|
| `PASS_OFFER_ID` | `pass-3mo` | Pass It On only — the gated 3-month offer |
| `NORMAL_YEARLY_OFFER_ID` | `free-trial-2` | The ordinary annual paywall |

⚠️ **These must match Play Console exactly.** `getNormalSubscriptionOption()`
deliberately filters the pass offer out of the ordinary paywall — RevenueCat's
own default favours the longest free trial, which would otherwise hand every
annual buyer the private three-month offer. If `free-trial-2` stops matching, the
normal paywall silently falls back to the base plan and buyers are **charged
immediately with no trial**. That failure is invisible in code and shows up only
as a conversion drop, so re-check it whenever Play offers are edited.

### Tables

| Table | Grain | Key columns |
|---|---|---|
| `gift_credit_grants` | one row per earn event | `anonymous_id`, `grant_key`, `credits`, `granted_at` |
| `gift_shares` | one row per credit spent | `token`, `sender_anonymous_id`, `android_gift_code`, `created_at` |
| `offer_code_inventory` | one row per store code | `code`, `platform`, `product`, `batch_id`, `expires_at`, `share_token`, `dispensed_at` |
| `gift_codes` | retired SD-code history only | no new rows after 2026-08-15 |

⚠️ **`android_gift_code` is misnamed now.** Since 2026-08-16 it holds a claim
marker, `play:<rc_app_user_id>` — not a code. Older rows still hold real SD
codes or Google promo codes, so read it by prefix: a `play:` value is a claimed
Android pass, anything else is legacy. Left renamed-in-place deliberately; a
column rename would break the deployed function for no operational gain.

⚠️ **`offer_code_inventory` Android rows are cold standby.** The live Android
path never touches them. Rows may exist from the brief Google-promo-code window
(2026-08-15/16) and are kept on purpose in case the gated offer ever has to be
rolled back — but nothing dispenses them today. Only the **iOS yearly** pool is
load-bearing.

`grant_key` values: `annual_y1…` (5/yr), `tenure_3`, `tenure_6…` (1 per 3 paid
months), `monthly_signup` (1, at signup), `founding_y1` (5, grandfathered v1).

---

## 2. Health checks

### 2.1 Inventory level — run this weekly

**Only the `ios` / `yearly` row matters.** Apple dispense fails with
`out_of_stock` when that pool is dry, and the pop query skips anything expiring
within 7 days. Android rows are standby stock (§1) — a dry Android pool breaks
nothing.

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

`available` is the real blast-radius control for iPhone recipients. Keeping the
loaded pool small is the throttle — a batch of 25 caps the worst case at 25
codes. Android has no equivalent ceiling: passes are throttled by credit balance
alone, since each one is an ordinary Play purchase.

### 2.2 Apple codes dispensed but apparently never redeemed

This is the signature of an abandoned redemption. The `/get` UA gate prevents
desktop assignment and routes Android away from the Apple pool entirely.

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
  count(*) filter (where android_gift_code like 'play:%')               as claimed_android,
  count(*) filter (where android_gift_code is not null
                     and android_gift_code not like 'play:%')           as claimed_android_legacy,
  count(*) filter (where exists (select 1 from offer_code_inventory i
                                 where i.share_token = gift_shares.token)) as claimed_apple,
  count(*) filter (where android_gift_code is null
                     and not exists (select 1 from offer_code_inventory i
                                     where i.share_token = gift_shares.token)) as never_claimed
from gift_shares;
```

`never_claimed` is expected to be non-trivial — links get sent and ignored. A
sudden spike is worth a look at `/get` (deployed? erroring? gate too strict?).

`claimed_android_legacy` should be a small fixed number and never grow. Growth
means something is still dispensing Google promo codes — check that the website
is sending `flow: "play_offer_v1"` (§6).

**A claim is not a purchase.** `claimed_android` counts people who reached the
Play sheet, not people who bought. The marker is written first so the token can
be locked to one account, so an abandoned purchase looks identical to a completed
one in SQL. Confirm Android conversions in RevenueCat, not here.

```sql
-- Android claims, newest first — cross-check against RevenueCat.
select token, android_gift_code, created_at
from gift_shares
where android_gift_code like 'play:%'
order by created_at desc;
```

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

### 3.1 An iPhone recipient is stuck with a dead Apple code

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

### 3.2 An Android recipient can't claim their pass

Nothing to recycle here — no code was ever minted. Diagnose by the message the
app showed, which maps one-to-one onto a `get-dispense` reason:

| What they saw | Reason | What happened |
|---|---|---|
| "already been claimed on another account" | `already_claimed` | A different RevenueCat app user claimed this token first. Usually a reinstall or a second device, not abuse. |
| "opened using the retired code system" | `legacy_pass` | The token is bound to an `offer_code_inventory` row from the 2026-08-15/16 promo-code window. |
| "not valid. Ask your friend to send it again" | `invalid_token` | No `gift_shares` row — a mistyped or truncated link. |
| "This offer isn't available yet" | *(no server call)* | Google withheld `pass-3mo` from this account. Almost always means the account already had the annual subscription; offers are once per account, and Play removes ineligible ones. |

The last row is the common one and is **not** a bug — the person is ineligible
for an introductory offer, and no amount of unbinding changes that. Refund the
credit (§3.3) so the giver can pass it to someone else.

For a genuine mis-claim, release the token so the right account can take it:

```sql
-- Check first: this is the claiming app user id.
select token, android_gift_code, created_at
from gift_shares where token = '<token>';

-- Release it. The next app user to open the link wins.
update gift_shares set android_gift_code = null where token = '<token>';
```

⚠️ **Confirm no subscription was actually purchased before releasing.** The
marker is written before the Play sheet opens, so a claimed token may well have
a paid subscription behind it — check RevenueCat for that app user id. Releasing
a token whose purchase completed lets the pass be spent twice.

A `legacy_pass` token needs the Apple-side unbind from §3.1 first (clear its
`offer_code_inventory` row), after which it claims normally.

### 3.3 Refund a spent credit

Balance is `sum(grants) − count(shares)`, so refunding means deleting the share
row. Deleting it also discards any `play:` claim marker, since the marker is a
column on that row. **Unbind any dispensed Apple code first** (§3.1) or you
orphan it.

```sql
delete from gift_shares where token = '<token>';
```

### 3.4 Top up inventory

Generate yearly one-time codes in the App Store and export them, then convert
with `supabase/scripts/offer-codes-to-sql.py`. Generated SQL contains live codes
and must never be committed.

**Android needs no inventory.** `supabase/scripts/google-promo-codes-to-sql.py`
is retained only for the rollback path in §1 — if the gated `pass-3mo` offer ever
has to be withdrawn, that script plus reverting the website's `flow` flag restores
the promo-code pool. It is not part of any routine.

---

## 4. Live levers

No app-store round trip needed for any of these except where noted.

| Lever | Where | Effect |
|---|---|---|
| `PASSES_ENABLED` | `lib/creditsService.ts` | Master kill switch for earning/sending. Balance reads 0, no token mints, no thank-you. Client-side → ships by **OTA**. |
| `FOUNDING_CREDITS_ENABLED` | Supabase env (default `true`) | Turns off the 5-credit grandfathered grant. Server-side, instant. |
| `dev_pass_granters` | Supabase table | Device ids allowed to hand-grant passes (§7). Empty = nobody. Server-side, instant. |
| iOS inventory | `offer_code_inventory` | Finite Apple annual-offer pool. Dry = iPhone recipients get `out_of_stock`. |
| `pass-3mo` offer | Play Console | Deactivating it stops Android passes at the app: "This offer isn't available yet". Instant, no deploy. |
| `flow: "play_offer_v1"` | web repo `src/lib/gift.ts` | Removing it reverts Android to the Google promo-code pool (§3.4). Requires a Lovable publish. |

Server-side gates already in place, for reference: sandbox subscriptions earn
no credits, and no credits accrue while a subscriber is riding a free/intro
period (`_shared/credits.ts`). Both exist so testers can't mint passes that
dispense real codes.

---

## 5. Testing without a separate environment

**The `/get` branches are free to inspect** — the page renders its gate before
anything dispenses, so opening a link on desktop, iPhone and Android and looking
at what appears costs nothing.

**iPhone redemption tests consume codes.** Test a fresh account through the
complete native purchase sheet. Verify three free months, the annual renewal
amount, RevenueCat entitlement attachment, cancellation, and return to the app.

⚠️ Unverified: Apple offer codes are believed to be redeemable only in
**production**, not by sandbox Apple accounts. Confirm against Apple's docs
before planning any sandbox-based test of the iOS recipient path.

**Android redemption tests consume no inventory** — but they do burn the tester's
Play account, permanently. Introductory offers are once per account, so once a
Google account has taken `pass-3mo` (or the annual subscription at all) it can
never test the recipient path again; it will land on "This offer isn't available
yet" forever. Budget a fresh Google account per full Android test.

**Test the handoff separately from the purchase.** The two halves fail
independently and only the second is expensive:

1. *Handoff, free to repeat.* Open `soberdailies.com/get?g=<token>` on Android
   with the app installed — Chrome should hand off to `myapp://pass?g=…` and
   `PassOfferScreen` should appear over whatever the app was showing, including
   mid-onboarding. Uninstall and repeat to exercise the Play-listing fallback and
   install-referrer path; the token is read on first launch after install. Neither
   consumes the pass — the token is not claimed until **Continue to Google Play**
   is tapped.
2. *Purchase, one shot per account.* Only from there does the claim get written
   and the Play sheet open.

**Device reset.** The Developer Console's "Reset Subscription State" clears the
anonymous ID and onboarding flags and logs RevenueCat out, which drops
grandfather status and entitlement — but it does **not** clear the App Store
receipt (an Apple-ID-level fact no app control can touch) and does **not** clear
local content like dailies and journal entries. For a genuinely fresh recipient
you need an Apple ID that has never subscribed.

---

## 6. Before the program goes live

- [ ] `/get` UA gate deployed (web repo `sober-day-reflections` — iPhone →
      yearly Apple pool, Android → hand off into the app, everything else → open
      on your phone).
- [ ] Website published at `soberdailies.com` — the app's share links point
      there. **Publishing is a Lovable step, separate from pushing to `main`.**
- [ ] Active **iOS** yearly offer-code inventory loaded. Android needs none (§1).
- [ ] **Play Console: `pass-3mo` active and gated** on the annual subscription
      product, and `free-trial-2` still the ordinary annual offer. Both IDs must
      match `lib/subscriptionOffers.ts` exactly — see the warning in §1.
- [ ] **`supabase functions deploy credits-status credits-share`** — the earn
      gates (sandbox, free-period, promotional) live in `_shared/credits.ts`
      and only apply once deployed. Discovered 2026-07-27: the deployed
      functions predated the 7/22 gates, and a TestFlight sandbox yearly earned
      a real `annual_y1` grant. Verify the last-deployed date in the dashboard
      is AFTER the latest `_shared/credits.ts` change.
- [ ] `PASSES_ENABLED` flipped to `true` and OTA'd (this is the actual go-live).

Apple codes sitting in the console are invisible to `get-dispense`; only imported
rows can be dispensed. Watch `next_expiry` (§2.1). Apple one-time batches need
roughly six-month replenishment.

### 6.1 ⚠️ Ordering: the app must ship before the website

The Android handoff has a client half and a server half, and **the server half
went live first**. `get-dispense` and the published website both speak
`play_offer_v1` as of 2026-08-16, but `PassOfferScreen` and the `myapp://pass`
route only exist in builds from `7e8b9282` onward.

Until an Android build carrying that code reaches production, an Android
recipient is handed off to an app that has no route for them and lands on an
unmatched screen. The pass survives — `get-dispense` returns the handoff URL
without consuming anything, and binding only happens on the app's explicit claim
— so the same link works once the client ships. But the giver's credit was spent
at send time, so every Android link sent in that window looks broken to the
person receiving it.

**If this ordering is ever inverted again**, the fast fix is an Android-only OTA;
it reaches shipped Android builds without touching any iOS build, including one
sitting in App Review:

```bash
eas update --channel production --platform android -m "Android pass handoff"
```

That works without a rebuild because `scheme: "myapp"` has been in `app.json`
since the initial commit and `expo-application` (which supplies the install
referrer) predates the shipped binaries. Everything else in the handoff is JS.

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
  token; an Apple code only leaves inventory when an iPhone recipient taps the
  redemption button on `/get`, and an Android pass is only claimed when the
  recipient taps **Continue to Google Play** inside the app (§1). An ignored link
  costs nothing — that is the `never_claimed` bucket in §2.4.
- **The recipient path is annual-only:** iPhone → Apple yearly offer code,
  Android → the gated `pass-3mo` offer on the annual product; both renew annually
  after 3 free months, billed by the store.
- Do not distribute raw codes outside the pass flow; the private token is the
  control that keeps one store code attached to one pass.
