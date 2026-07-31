# Access Test Plan — onboarding, subscription, grandfather, codes

The launch-gating test pass: every way a user gets **into** the app. Each
case says who the user is, how to set the device up, what to do, and what
must happen. Check cases off as they pass; anything that fails goes to
`LAUNCH-CHECKLIST.md` §3 as a blocker.

Written 2026-07-30 against the actual gating code (refs throughout).
The entire gate lives in `app/_layout.tsx` and renders in this order:

> **onboarding → (loading) → paywall → disclaimer → app**

Consequences to keep in mind while testing:
- `isPremium` is consumed in exactly ONE place (`app/_layout.tsx:266`).
  There is no per-feature gating — once past the wall, everything is open.
- The **disclaimer only appears after premium** is resolved. A user who
  never gets past the paywall never sees it. That is by design (moved
  2026-07-23).
- Premium = `entitled (RC) OR grandfathered (Supabase) OR dev override`,
  overridden by the QA force-new-user toggle, and web is always premium.
  (`hooks/useSubscription.ts:175-180`)

---

## Part 0 — Test rig (read once before starting)

### Developer Console
Settings → scroll to the version number → **long-press 500 ms**. Present in
production builds (removal is a launch-flip item). Controls used below:

| Control | What it does | Gotcha |
|---|---|---|
| **Force new-user paywall** | SecureStore flag that ignores entitlement + grandfather so the paywall shows | Auto-restarts to apply. A purchase while ON unlocks **this session only** — relaunch shows the paywall again until you turn the toggle OFF. |
| **Reset subscription state** | Deletes premium override + anonymous ID, clears both onboarding keys, `Purchases.logOut()` | You must restart manually. Does NOT clear the App Store receipt — a later purchase attempt may say "already subscribed" and RC will transfer the sub to the new identity. Does NOT clear journal/dailies data. |
| **Run onboarding again** | Clears the v3 flag; gate swaps instantly | Keeps all data. |
| **Run onboarding as v2 upgrader** | Clears v3 flag, SETS the legacy v2 flag | Produces the "What's new" upgrader variant. |
| **Preview · Trial / No trial** | Renders PaywallScreen with `forceTrial` in a modal | Layout check only — buys are real if you tap them. |
| **Passes on this device** + **Grant 5 passes** | Device-only override of `PASSES_ENABLED` + server RPC grant | Needed for any gift-giver testing while `PASSES_ENABLED = false`. |
| **Device ID (tap to copy)** | The `anonymous_id` used for grandfather + gifts | Needed to fabricate a grandfathered identity (below). |

### Manufacturing each user type

| User type | Recipe |
|---|---|
| **Brand-new user** | ⚠️ A clean install is NOT enough on iOS: `anonymous_id` lives in the **Keychain, which survives uninstall** — a reinstall re-runs onboarding (AsyncStorage is wiped) but keeps the old identity, so a grandfathered device still skips the paywall (verified 2026-07-30). On a personal/grandfathered device use **Force new-user** (preserves identity); on a spare device use **Reset subscription state** → restart (mints a NEW anonymous_id — the old grandfathered/allowlisted identity is lost unless re-inserted in Supabase). To also be **trial-eligible**, the store account must never have used the intro offer — on iOS that means a fresh **Sandbox Apple ID** (Settings → App Store → Sandbox Account); on Android intro eligibility always reports UNKNOWN, which the app treats as eligible (`hooks/useSubscription.ts:400`), so any license tester sees the trial view. |
| **Trial-used user** | A sandbox account that has already consumed the intro offer (buy once, let it expire, reinstall). |
| **v2 upgrader** | Developer Console → Run onboarding as v2 upgrader. |
| **Grandfathered user** | The device's `anonymous_id` needs a `user_profiles` row with `created_at < 2026-02-04` (is_grandfathered is a generated column). Copy the Device ID from the console, then in Supabase SQL: `insert into user_profiles (anonymous_id, created_at) values ('<id>', '2026-01-15T00:00:00Z');` — restart the app. To un-grandfather: delete the row or Reset subscription state (new anonymous ID). |
| **Returning subscriber** | Any device holding an active sandbox/test sub. |
| **Lapsed subscriber** | Sandbox subs auto-expire in minutes (iOS: 7-day trial ≈ 3 min, monthly ≈ 5 min; Play test subs renew a few accelerated cycles then expire). Just wait one out. |

### Sandbox facts that look like bugs but aren't
- **Play test subs expire after a few accelerated cycles** → Android testers
  periodically re-hit the paywall. Expected.
- **The day-5 trial reminder can NEVER fire from a sandbox trial** — it
  schedules 48 h before expiry and skips anything <60 s out
  (`lib/trialReminder.ts:93`); a 3-minute sandbox trial is always skipped.
  See E1 for how to test it anyway.
- **No thank-you sheet after purchase** while `PASSES_ENABLED = false` —
  the announcement flag is swallowed (`lib/creditsService.ts:256-261`).
  Turn "Passes on this device" ON to see the sheet.
- **No passes are ever earned in sandbox** (`is_sandbox` skip in
  `_shared/credits.ts` — deliberate, sandbox passes could dispense REAL
  offer codes), and **no passes during any trial/intro period** (earned on
  first real charge). Verified 2026-07-30: sandbox annual → 0 grants,
  expected. Stage giver-side tests with Console → Grant 5 passes instead.
  ⚠️ Production implication: new members see the thank-you sheet promise
  passes that don't arrive until the trial converts — copy decision open.
- **Grandfathered + airplane mode = access, once verified.** Changed
  2026-07-31: a device that has verified ONCE keeps access through an outage
  or an offline launch; one that never has still fails closed
  (`docs/revenuecat-grandfather-flow.md`). B2 tests both halves.
- **Trial reminder is inert on build ≤130** — `expo-notifications` ships in
  the NEXT binary. E-cases need a fresh dev build.

### Before you start
- [ ] Current known state: `PAYWALL_ENABLED = true`, `PASSES_ENABLED =
      false`, disclaimer sits after the paywall. Paywall X: dev builds and
      **all Android builds** have it (testing escape hatch, re-added
      2026-07-30); iOS TestFlight/store builds are a hard wall. The Android
      X reverts to `__DEV__`-only at ship time (LAUNCH-CHECKLIST §1).
- [ ] Have: an iOS device + fresh sandbox Apple ID, an Android device with
      a license-tester account on build 130, and Supabase SQL access.

---

## Part A — First-time users

### A1 · Fresh install, trial-eligible (iOS) — the money path
**Setup:** iOS device made "new" per the Part 0 recipe (clean install alone
is NOT enough — Keychain identity survives; use Force new-user on a
grandfathered device), fresh sandbox Apple ID signed into Settings → App
Store → Sandbox Account. On build 130 confirm OTA #4+ is applied BEFORE
purchasing (embedded bundle has the §15 purchase crash): Developer Console →
Check for update → restart.
**Steps:**
1. Launch. → Onboarding, "The habits that build long-term sobriety" welcome
   (new-user copy, not "What's new").
2. Get started → What's-inside carousel (4 slides: today, sponsor, tools,
   journey). Swipe through; also verify **Skip** jumps ahead.
3. Sober date step: set a date → Set my date.
4. Define your dailies: 7 starter items pre-checked (Morning Prayer,
   Gratitude, Meeting, Literature, Nightly Review, Evening Prayer…), editor
   works. → "Let's get started".
5. **Paywall appears — trial layout**: "Your first week is free", 3-bead
   Today/Day 5/Day 7 timeline, CTA "Start my free week", yearly
   pre-selected with SAVE badge, monthly available, prices non-zero.
   **No X button** (TestFlight/store build).
6. Tap CTA → Apple sandbox sheet shows the free-trial terms → confirm.
7. Notification-permission prompt appears (trial reminder scheduling) —
   grant it.
8. **Disclaimer** appears (3 bullets + checkbox). Continue disabled until
   checked. Check → Continue.
9. Land on Today. Sober date from step 3 is reflected; the dailies you
   chose are the list.
10. Kill and relaunch → straight to Today. No paywall flash, no onboarding.

**Expect:** every numbered outcome above; the whole path with zero dead
ends. This is the case to run most often.

### A2 · Fresh install (Android)
Same as A1 on a license-tester device from the open-testing track.
Differences to verify:
- The paywall **has an X** (Android testing escape hatch) — tapping it
  dismisses the wall for the session; relaunch brings the paywall back.
- Purchase sheet says **"Test card, always approves"** (no real charge).
- Trial view shows (Android eligibility is UNKNOWN → treated eligible).
- RevenueCat dashboard shows the entitlement granted.
- This closes LAUNCH-CHECKLIST §2 "Verify an Android test purchase".

### A3 · First-timer who already used a trial (no-trial paywall)
**Setup:** iOS device, sandbox account whose trial was already consumed
(run A1, let the sandbox sub expire, delete + reinstall app, Reset
subscription state if reusing the device).
**Steps:** onboard → paywall.
**Expect:** **No-trial layout**: "Start your journey", 4 benefit tiles (no
timeline), CTA "Subscribe", billing line "Billed {price}/{period}. Cancel
anytime in Settings." Purchase works and lands on disclaimer → Today.
*(Quick layout-only check anytime: Console → Preview · No trial.)*

### A4 · Bail out of the purchase sheet
**Setup:** any not-premium state at the paywall.
**Steps:** tap CTA → cancel the store sheet.
**Expect:** returns to the paywall cleanly — no spinner stuck, no error
alert for user-cancel, CTA tappable again. App remains walled (no X in
TF/store builds). Kill + relaunch → paywall again (onboarding NOT re-run —
completion was already recorded).

### A5 · Paywall with no/failed offerings (degraded network)
**Setup:** not-premium device; airplane mode ON before a cold launch.
**Steps:** launch cold, watch what renders after the teal loading fill.
**Expect (current known behavior — decide if acceptable):**
`trialEligible` stays `null` → **trial layout renders** with no packages /
no prices (`components/PaywallScreen.tsx:126` — null is treated as
eligible). Note what the CTA does with nothing loaded. Then restore network,
relaunch → paywall populates. If the empty state is ugly enough to matter,
it's a launch-checklist item, not a silent pass.

### A6 · Kill mid-onboarding
**Setup:** fresh state; get to the sober-date step, set a date, then to the
dailies step; kill the app.
**Steps:** relaunch.
**Expect:** onboarding restarts at Welcome (step position is not
persisted — fine), but the saved sober date survives: on reaching the date
step it shows the previously set date. Completing still works.

---

## Part B — Upgraders from v2

### B1 · v2 user, grandfathered (the founding-member path)
**Setup:** Console → copy Device ID → insert the grandfather row in
Supabase (recipe in Part 0) → Console → Run onboarding as v2 upgrader →
app shows onboarding.
**Steps:**
1. Welcome says **"Welcome to the new Sober Dailies"** / "Everything you
   saved is still here" / CTA "See what's new".
2. Carousel has the "WHAT'S NEW" overline.
3. **Sober-date step is SKIPPED** (upgrader with an existing date goes
   straight to dailies — `components/OnboardingFlow.tsx:255`).
4. Dailies step → finish.
5. **NO PAYWALL.** Straight to disclaimer (if never accepted on this
   install) → Today.
6. All v2 data intact: sober date, journal, gratitude, legacy dailies.
7. Cold relaunch with network → straight to Today (grandfather re-checked
   every launch; there is no cache).

**Expect:** a grandfathered v2 user never sees a price.

### B2 · Grandfathered user, offline cold launch (cached yes)
**Setup:** B1 device, onboarding complete, and it must have completed a
successful online launch first — that's what caches the yes. Airplane mode
ON. Kill app.
**Steps:** cold launch.
**Expect:** **Today, no paywall.** The grandfather check can't reach Supabase,
so it honours the cached verification (`grandfather_verified_v1`, keyed to
this device's anonymous_id). Changed 2026-07-31 — this used to fail closed
and show a paywall to a paying-nothing founding member, which is how the July
RLS incident locked people out.

**Then the negative half, which matters more:** on a device that has NEVER
verified (Reset subscription state → new anonymous_id → airplane mode → cold
launch) the paywall SHOULD appear. If it doesn't, the cache is granting access
it was never given, and that's a real bug.

### B3 · v2 user, NOT grandfathered
**Setup:** Console → Reset subscription state (new anonymous ID = no
grandfather row) → restart → Console → Run onboarding as v2 upgrader.
**Steps:** run the upgrader onboarding.
**Expect:** upgrader copy + skipped date step as in B1, but the **paywall
DOES appear** after dailies. Purchase or code proceeds normally →
disclaimer → Today with v2 data intact.

---

## Part C — Returning users

### C1 · Active subscriber, cold launch
**Setup:** device that completed A1/A2 with a live (sandbox) sub.
**Steps:** kill → cold launch, with network. Repeat once in airplane mode.
**Expect:** teal loading fill briefly, then Today. **No paywall flash.**
Offline note: RC caches customerInfo on-device, so a recently-active
subscriber should still pass offline — verify, and note the actual behavior
if not.

### C2 · Reinstall / new phone (restore path)
**Setup:** active sandbox sub → delete the app → reinstall (same store
account).
**Steps:**
1. Launch → onboarding runs again (local flags are gone — expected).
2. Paywall appears (RC has a fresh anonymous ID with no entitlement).
3. Tap **Restore** (or attempt purchase — the store will say already
   subscribed and RC transfers).
**Expect:** Restore finds the sub → gate drops → disclaimer → Today.
Restore with NO sub on the account shows the "No active subscription…
Have a code?" alert and stays walled.

### C3 · Cancelled trial / lapsed subscriber
**Setup:** A1 device; cancel the trial in sandbox subscription settings (or
just wait — sandbox expires in minutes). Kill app.
**Steps:** cold launch after expiry.
**Expect:** paywall returns. **No-trial layout** this time (trial already
consumed). Data (journal, dailies, sober date) is all still on the device
and returns intact after re-subscribing — the wall gates access, never
deletes anything.

### C4 · QA force-new-user round trip (tooling sanity)
**Setup:** premium device → Console → Force new-user ON (auto-restarts).
**Steps:** paywall shows with the **orange QA banner**. Purchase → gate
drops for this session. Kill + relaunch → paywall AGAIN (session unlock is
not persisted — expected). Console → toggle OFF (restarts) → Today.
**Expect:** exactly that sequence; banner clearly marks QA state.

---

## Part D — Codes (Pass It On + Apple offer codes)

Gift grants are RC **promotional** entitlements, duration `three_month`
(server env default — QA 24 h was reverted). Redemption's only live entry
point is the paywall's **"Have a code?"** modal (`redeem.tsx` is orphaned).

### D1 · Redeem a valid SD code
**Setup:** *Giver device* (device #1, premium): Console → Passes on this
device ON → Grant 5 passes. *Recipient device* (device #2): fresh
not-premium state at the paywall (different anonymous ID **and** different
RC ID — reset sub state on a second device, not the giver).
Mint the code: device #1 → Settings → Pass It On → give → the composer
opens with the link (`soberdailies.com/get?g=…`) → actually send it (to
yourself is fine). For direct redemption testing you can instead pull the
SD code from the `gift_codes` table.
**Steps (device #2):** paywall → Have a code? → type the code — verify
auto-formatting to `SD-XXXX-XXXX` while typing → Redeem.
**Expect:** success → modal closes → gate drops → disclaimer → Today.
RC dashboard shows a promotional `premium` entitlement, ~3-month expiry.
`gift_codes` row flips to redeemed.

### D2 · Self-redemption blocked
**Steps:** redeem a code on the device that minted it.
**Expect:** friendly error (self_redemption), code **not consumed**
(row still `available`).

### D3 · Already-premium redemption declined without burning the code
**Steps:** on a premium device, force-new-user OFF… simplest: redeem the
same code on a device that already has an active sub (reach the modal via
Console → Preview won't work — preview suppresses redemption; use a real
walled state with an entitled store account, or accept D3 as a server test:
call gifts-redeem for an entitled identity).
**Expect:** `already_premium` error, code still `available` for someone
else.

### D4 · Invalid / already-used code
**Steps:** redeem `SD-XXXX-XXXX` garbage; then re-redeem D1's consumed
code on a third identity.
**Expect:** "invalid" and "already_redeemed" errors respectively, distinct
readable copy, modal stays up for retry.

### D5 · Apple offer code via soberdailies.com/get — LIVE ONLY
Offer codes have no sandbox. This is LAUNCH-CHECKLIST §3's "End-to-end
pass test on real devices" and can only be run against production:
send from Neal's phone → recipient (iPhone) taps the link → /get detects
iOS → Apple offer-code redemption sheet → clean install → **no paywall
flash** on first launch. Android recipient must get the SD-code variant
(UA gate) — verify an Android phone never sees an Apple code.
**Do not run casually — each run burns a real offer code** (batches expire
2027-01-20 anyway).

### D6 · Giver-side spend-half cycle (~2 min, SESSION-HANDOFF §11.7)
give → cancel the composer → balance still 5 → give again → **same token**
returns → actually send → balance 4, `sent_at` stamped on that row only.

> ⚠️ Before `PASSES_ENABLED` flips to true for real users, the
> LAUNCH-CHECKLIST §1 security item (client-supplied `anonymous_id` trust
> in credits-share/credits-status) must land. Testing with the device
> override is fine; shipping isn't.

---

## Part E — Day-5 trial reminder

Requires a binary with `expo-notifications` (NEXT build — inert on ≤130).
Sandbox trials can never schedule it (48 h lead vs 3-min trials), so:

### E0 · See the notification itself (copy/appearance)
Developer Console → **Preview · Trial reminder** — fires the real
notification ~8 s later through the same pipeline (permission prompt,
Android channel, exact production copy with a representative date).
Background the app to see the banner. On a binary without the native module
it explains itself instead of no-opping. This checks LOOK and COPY only —
E1/E2 below test the actual scheduling/cancellation logic.

### E1 · Scheduling (dev-build hack)
**Setup:** dev build with `WARN_BEFORE_MS` in `lib/trialReminder.ts:28`
temporarily set to ~2 minutes, on a real device (simulator CoreAudio/MLKit
quirks aside, notifications want a device). Revert after.
**Steps:** run A1's purchase. Grant the permission prompt. Background the
app; wait past the fire time (quiet-hours clamp: fires ≥09:00/≤21:00).
**Expect:** notification "Your free week is almost up" with the correct
end date. `trial_reminder_scheduled` in the logs.

### E2 · Cancellation sync
**Steps:** after E1 schedules (before it fires), cancel the trial in
subscription settings; foreground the app so customerInfo refreshes.
**Expect:** reminder is cancelled (`syncTrialReminder` — `willRenew` went
false); no notification ever arrives. Same on conversion/expiry.

### E3 · Permission denied
**Steps:** A1 purchase but DENY notifications.
**Expect:** purchase completes normally, no crash, `trial_reminder_
permission_denied` logged, everything else proceeds.

---

## Part F — Cross-cutting sanity

- **F1 · Disclaimer shows exactly once per install** — after first
  premium resolution; never again on later launches; Continue stays
  disabled until the checkbox is ticked; kill-during-disclaimer → it
  reappears on relaunch.
- **F2 · Gate order is stable** — from a fully-reset device the sequence
  is always onboarding → paywall → disclaimer → Today, and completing a
  later gate never resurrects an earlier one.
- **F3 · No premium leakage** — while walled, there is no way into the
  app: backgrounding/foregrounding, rotation, notification taps, deep
  links — the paywall must still be there. (Exception during testing: the
  Android X legitimately dismisses it for the session.)
- **F4 · Data safety across every wall** — no path in this plan (reset,
  lapse, re-onboard, redeem) may destroy journal/gratitude/dailies/sober
  date. Any data loss anywhere is an automatic launch blocker.

---

## Suggested order of attack

1. **A1 iOS end-to-end** (the money path) — everything else builds on it.
2. **A2 Android** — also closes the open Play test-purchase checklist item.
3. **B1 + B3** (upgraders) — protects the existing user base.
4. **C1–C3** (returning/lapsed/restore).
5. **D1–D4 + D6** (SD codes, sandbox-safe).
6. **A3–A6, B2, C4, F-cases** (edges and tooling).
7. **E-cases** once the next binary exists.
8. **D5** last, live, deliberately — it burns real offer codes.
