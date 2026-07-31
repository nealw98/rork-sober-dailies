# Launch Checklist — Sober Dailies 3.0 public release

Single source of truth for what must happen before the app ships to **end
users** (store release, not testers). Consolidated 2026-07-27 from
SESSION-HANDOFF.md §6 / §11.9 / §12.5 and the memory to-do notes. Check items
off here as they land; when everything in sections 1–3 is done, the app is
clear to ship.

---

## 1. Launch flips & removals (do these at ship time, as one pass)

- [ ] **`PASSES_ENABLED` → `true`** (+ OTA) — turns on the Pass It On gift
      acquisition program for real users.
- [ ] **`EXPO_PUBLIC_ANALYTICS_ENV` → `production`** — Mixpanel currently
      writes to the test env. Flip in EAS env for the release build/OTA.
- [ ] **Remove the Android paywall X (dismiss) button** — RE-ADDED
      2026-07-30 for the access-test pass (was removed 2026-07-27): both
      gates are back to `__DEV__ || Platform.OS === 'android'`
      (`app/_layout.tsx`, `components/PaywallScreen.tsx`), so Android
      testers can escape the wall during testing. Revert both gates to
      `__DEV__` only at ship time so store builds on both platforms get
      the hard wall.
- [ ] **Remove or `__DEV__`-gate the QA "Force New-User (paywall)" toggle** —
      Debug Console button (Settings → long-press version) in
      `app/(main)/(tabs)/settings.tsx`; SecureStore key
      `sober_dailies_qa_force_new_user` read in `hooks/useSubscription.ts`.
      While at it, decide whether the other Debug Console QA buttons
      (Reset Subscription State, Preview Paywall) and the redeem bypass
      should be `__DEV__`-gated too.
- [ ] **Bump the runtime version for the store release** — 3.0.8
      recommended, so store binaries stop sharing an OTA channel with the
      3.0.7 tester fleet.
- [x] **SECURITY: stop `credits-share` / `credits-status` trusting a
      client-supplied `anonymous_id`** (SESSION-HANDOFF §11.3) — **COMPLETE:
      server deployed + verified 2026-07-30, client shipped in the
      2026-07-31 production OTA.** Trust-on-first-use device secret:
      `supabase/migrations/20260730_device_claims.sql` (service-role-only
      table, applied to prod), `supabase/functions/_shared/deviceAuth.ts`,
      `credits-share` strict / `credits-status` lenient-until-claimed (both
      deployed), client secret in `lib/deviceSecret.ts` sent via
      `creditsService` `identity()`. Live 7-case smoke test passed: unclaimed
      + no secret reads OK but cannot spend; first call with a secret claims
      the id; wrong secret and missing-secret-on-a-claimed-id are refused on
      both functions.
      Housekeeping: `delete from device_claims where anonymous_id like
      'qa-deviceauth-%';` removes the smoke-test row.
- [x] **Commit + OTA the client `device_secret` half** — DONE 2026-07-31
      (commit `3b87fa22`, production OTA group `c9490af8`). `credits-share`
      refuses any caller that sends no secret, so gift sharing was
      inoperative until this shipped; it is now functional again. Any FUTURE
      binary or channel that predates this OTA has the same problem.
- [x] **Guard `getSMS()` the way `trialReminder` is guarded** (§15.4) — DONE
      2026-07-30 pm #3: `app/(main)/pass-it-on.tsx` now probes
      `requireOptionalNativeModule('ExpoSMS')` before the require, so the
      passes flip can't repeat the build-130 fatal in `giveGift()`.

## 2. Android pending work

- [x] **Upload AAB build 130 to Play** — DONE 2026-07-27: Neal uploaded it
      to the open-testing track. Clears the Play API-36 policy warning
      (deadline was 2026-08-31).
- [x] **Edge-to-edge QA on build 130 before promoting** — emulator sweep
      PASSED 2026-07-27 (universal APK from the store AAB, API-36 emulator):
      onboarding, paywall (+Android X), disclaimer, milestone takeover,
      Today + milestone band, tab band + FAB, all four tabs, Settings,
      dark mode status-bar contrast, sponsor chat — all insets correct.
      Findings: "1 years · 0 months" plural bug on the Today counter (see
      §3). Remaining on-device spot-check (emulator can't cover): sponsor
      chat with the real soft keyboard up, and a quick eyeball of the
      milestone takeover on a notched phone.
- [x] **Verify an Android test purchase end-to-end** — PASSED 2026-07-31
      on device (Neal): subscribe flow completes and the entitlement is
      granted. The Android paywall X therefore has no remaining
      justification and exits with the §1 launch flips. Note: Play test
      subscriptions renew on an accelerated clock and expire after a few
      cycles, so testers will periodically re-hit the paywall — expected,
      not a bug.
- [x] **v3 pricing without touching v2 subscribers** — DONE 2026-07-31.
      Final prices are **$3.99/mo and $19.99/yr**, a DECREASE from
      $4.99/$24.99, so none of the price-increase consent machinery applies.
      Neal configured both stores in place (Option A — no new SKUs, so the
      existing offer-code batches stay attached): grandfathered stay free,
      v2 subscribers keep v2 pricing, new v3 subscribers get the new price.
      Nothing to change in the app — no price literal exists in the codebase;
      the paywall reads `product.priceString` and derives the rest, so it
      will show $1.67/mo for yearly and hold at SAVE 58% (19.99/12 vs 3.99
      = 58.2%). Remaining: confirm the new numbers actually render during
      the A1 access test — store price changes take hours to propagate and
      RevenueCat caches offerings. The grandfather hardening that used to
      gate this item was done anyway the same day (§3) — not because the
      price moved, but because Neal's rule is that a grandfathered member
      should never meet a paywall.
      Web: `/get` quoted the old prices and was updated + published
      2026-07-31 (`sober-day-reflections` bdd3fbc).
- [x] **Activate Android cloud backup** — DONE 2026-07-27, and NO rebuild
      was needed (build 130 already ships the native modules). Google Cloud
      side (project `sober-dailies` under soberdailies@gmail.com): Drive API
      enabled; consent screen "Sober Dailies" / soberdailies@gmail.com,
      published to production; `drive.appdata` scope (classified
      NON-sensitive — no verification ever needed); TWO Android OAuth
      clients — Play app-signing SHA-1 (59:71:0F:…:1F:E1, moved out of the
      Daily Paths project where a 7/9 setup had stranded it) and EAS
      upload-key SHA-1 (32:7B:FD:…:0B:BB). App side:
      `cloudBackupSupported()` flipped to `driveAuthSupported()`
      (uncommitted, rides the next OTA). Remaining, tracked in §3:
      device E2E after the OTA, and the privacy-policy wording pass.
- [x] **Privacy/terms wording pass for Drive backup** — PUBLISHED
      2026-07-31 (`sober-day-reflections` f2d9680 + 3aa61ae, live and
      verified at soberdailies.com/privacy). Effective date moved to
      2026-07-31; it still read July 20, 2025 on first publish, which would
      have dated the policy before the terms it describes. ⚠️ The policy
      users actually read is the WEB one: every link in the app (onboarding, disclaimer,
      paywall footer, Settings) opens `soberdailies.com/privacy`, and
      the in-app `app/privacy.tsx` was an orphaned screen nothing routed to
      (like `redeem.tsx`) — **deleted 2026-07-30 along with its `Stack.Screen`
      registration**, so the policy now lives in exactly one place. Updated
      web repo `sober-day-reflections/src/pages/Privacy.tsx` (uncommitted
      there) with a new "Backup" section (optional, user's own
      iCloud / Drive app-data folder, we can't read it, revocable) plus
      accuracy fixes — the old text claimed data never leaves the device
      except for AI chat and aa.org links, which ignored subscriptions and
      analytics. Lesson for next time: after pushing to that repo, confirm
      Lovable's `latest_commit_sha` matches BEFORE deploying — a deploy
      fired seconds after the push rebuilt the pre-push state and reported
      success.

## 3. Finishing the product / QA

- [x] **Bundle the accumulating uncommitted changes into ONE OTA** — DONE
      2026-07-31. Three production OTAs shipped that day (security client
      half + backup prompt + trial copy; then the Big Book front-matter
      corrections, grandfather cache and pass sheets). Nothing is sitting
      uncommitted now.
- [x] **Backup discoverability: verify the new first-entry prompt** —
      PASSED 2026-07-31 on a fresh install (Neal): the prompt fired on the
      first Journey entry. `lib/backupPrompt.ts` fires once per install and
      only when the device isn't already backing up (`cloudAvailable()`
      false), so it stays silent on a healthy iPhone.
- [x] **A grandfathered member never meets a paywall** (Neal, 2026-07-31) —
      the check used to fail CLOSED: any error, outage or offline launch
      meant "not grandfathered", which is exactly how the July RLS incident
      paywalled real founding members. `hooks/useSubscription.ts` now caches
      a verified yes against the device's `anonymous_id` and honours it when
      the check FAILS (error response or thrown). Deliberately narrow: a
      device that has never verified still fails closed, so the cache can't
      manufacture access; a successful "no" clears it, so un-grandfathering
      still takes effect once they're online; no TTL, since an expiry would
      reinstate the lockout during a long outage. Reset subscription state
      mints a new anonymous_id, which no longer matches the cache — so QA
      still falls back to the paywall. Test: grandfather a device, confirm
      access, then airplane-mode + relaunch — B2 in the access plan tests
      the OLD fail-closed behaviour and needs updating.
- [ ] **Day-5 trial reminder: next binary + device E2E** — added
      `expo-notifications`, so the JS is inert until the next build
      (lazy-require keeps old-binary OTAs safe). E2E requires a real-device
      sandbox trial.
- [x] **Fix the hardcoded "7 days" trial-length copy** on the custom
      paywall — DONE 2026-07-30 pm #3: `trialDaysFrom()` reads the
      package's free intro period from the store and `trialCopy()` phrases
      it; the Day-N beads derive too (warn bead = end − 2, matching
      `trialReminder`'s 48 h lead). A 7-day offer reproduces the approved
      wording character-for-character, and an unresolved offering falls
      back to it — so today's paywall is visually unchanged and only
      diverges if the store config does.
- [x] **Decide the trial/pass-promise mismatch** — DECIDED 2026-07-31
      (Neal): (a) soften the copy AND announce the arrival. The thank-you
      sheet now promises arrival rather than possession, without naming a
      trial length; a second `arrival` mode of the same sheet fires when the
      grant total actually rises, worded purely functionally with no billing
      language. Shipped in the 2026-07-31 OTA but invisible until
      `PASSES_ENABLED` flips. ⚠️ Still unseen on a device — Developer
      Console → Arrival · 5 passes previews it.
- [x] **Fix "1 years · 0 months · 0 days" pluralization** on the Today
      sobriety counter — FIXED 2026-07-27 in `SobrietyCounter.tsx`
      (uncommitted, rides the next bundled OTA).
- [ ] **End-to-end pass test on real devices** — send a pass from Neal's
      phone → recipient taps soberdailies.com/get → picks a plan → Apple
      redemption sheet → clean install → confirm NO paywall flash. Offer
      codes have no sandbox; this can only be verified live.
- [ ] **Verify the pass spend-half cycle** (~2 min, SESSION-HANDOFF §11.7):
      give → cancel composer → balance stays 5 → give again → SAME token
      returns → actually send → balance 4, `sent_at` set on that row only.
      (The grant half is already verified on device.)
- [ ] **Remote housekeeping** — the Supabase half is DONE (2026-07-31, Neal
      ran the deletes; `supabase functions list` confirms both gone).
      `gifts-purchase` and `gifts-wallet` had been ACTIVE in production since
      2026-07-13 even though their source was deleted from the repo on
      07-20 (`5b4954a4`) — unreferenced, unmaintained, publicly reachable,
      and `gifts-purchase` still trusted a client-supplied `anonymous_id`,
      the flaw class the device-secret work closed on `credits-*`.
      ⚠️ `gifts-redeem` and `get-dispense` were deliberately KEPT — legacy
      SD-XXXX codes, the Android pass fallback, and the `/get` page run
      through them.
      **Remaining:** remove the 3 ASC gift consumables from sale (App Store
      Connect → In-App Purchases) and deactivate the Play equivalents. The
      app can no longer initiate those purchases and the minting function is
      now gone, so this is tidiness plus keeping App Review from asking why
      the IAP list has products nothing reaches.

## 4. Deferred — explicitly NOT launch blockers (parked)

- RevenueCat-designed paywall swap (after first-round feature testing).
- Onboarding funnel analytics (step-level Mixpanel events; onboarding has
  zero tracking today).
- Full code audit/cleanup pass (orphaned `app/(main)/redeem.tsx`, stale
  release flags, broken eas.json profiles, tsc errors, 343 MB archive /
  missing .easignore).
- Expo SDK 53→54 upgrade — decided post-3.0.7 (plan file saved).
- BUY-passes idea (recheck Apple's terms on selling offer codes first) and
  a quarterly-pass arrival announcement (currently silent).

## 5. Post-launch watch items

- ASC offer-code batches 543009 (monthly) / 543010 (yearly) **expire
  2027-01-20** — remint before then.
- RevenueCat month-4 retention for pass cohorts; `credits-status` logs.
- Pricing revisit trigger: strong gift-cliff conversion at $3.99/$19.99.
