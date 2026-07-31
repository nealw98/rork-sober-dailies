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
- [ ] **SECURITY: stop `credits-share` / `credits-status` trusting a
      client-supplied `anonymous_id`** (SESSION-HANDOFF §11.3) — **SERVER
      HALF DEPLOYED AND VERIFIED 2026-07-30; client half still open (see the
      next item).** Trust-on-first-use device secret:
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
- [ ] **Commit + OTA the client `device_secret` half — must travel with the
      `PASSES_ENABLED` flip.** `credits-share` now refuses any caller that
      sends no secret, so **gift sharing is inoperative until this OTA
      ships**. Harmless today only because `PASSES_ENABLED` is false and
      `getShareLink()` returns null before the call. Uncommitted:
      `lib/deviceSecret.ts` (new) + `lib/creditsService.ts`.
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
- [ ] **Verify an Android test purchase end-to-end** — license testers are
      ALREADY set up (2026-07-27: Neal confirmed all testers are in the
      Play license-testing list), and subscription products exist on both
      stores at current prices. Remaining: on a device with build 130 from
      the open-testing track, run the subscribe flow — the purchase sheet
      should show "Test card, always approves" (no real charge) — and
      confirm RevenueCat grants the entitlement. Once verified, the
      Android paywall X (§1) has no remaining justification and exits with
      the launch flips. Note: Play test subscriptions renew on an
      accelerated clock and expire after a few cycles, so testers will
      periodically re-hit the paywall — expected, not a bug.
- [ ] **v3 price increase without touching v2 subscribers** — decided
      approach TBD (Option A: native price-increase flows — ASC "preserve
      current price for existing subscribers", Play base-plan change that
      applies to new purchases only, never tap "migrate"; Option B: new
      SKUs + RevenueCat offering rewire). Gate: harden the free-grandfather
      check (fail-open + cached) before or alongside any price change.
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
- [ ] **Privacy/terms wording pass for Drive backup** — DRAFTED 2026-07-30
      pm #3; **not done until Neal reviews the wording and the web repo is
      committed + published via Lovable.** ⚠️ The policy users actually
      read is the WEB one: every link in the app (onboarding, disclaimer,
      paywall footer, Settings) opens `soberdailies.com/privacy`, and
      the in-app `app/privacy.tsx` was an orphaned screen nothing routed to
      (like `redeem.tsx`) — **deleted 2026-07-30 along with its `Stack.Screen`
      registration**, so the policy now lives in exactly one place. Updated
      web repo `sober-day-reflections/src/pages/Privacy.tsx` (uncommitted
      there) with a new "Backup" section (optional, user's own
      iCloud / Drive app-data folder, we can't read it, revocable) plus
      accuracy fixes — the old text claimed data never leaves the device
      except for AI chat and aa.org links, which ignored subscriptions and
      analytics. **Neal to run: review the wording, then publish the web
      repo via Lovable.**

## 3. Finishing the product / QA

- [ ] **Bundle the accumulating uncommitted changes into ONE OTA** — the
      2026-07-27 session's work (Today + reader UI tweaks, day-5 trial
      reminder, storage-policy migration file) is uncommitted on
      `3.0.5-redesign`. One publish, not a drip. (Commit/OTA only when Neal
      says go.)
- [ ] **Backup discoverability: verify the new first-entry prompt** (added
      2026-07-30 pm #3). Android auto-sync silently no-ops until the user
      connects a Google account from the Backup screen, so the Drive feature
      was undiscoverable — nothing ever asked. `lib/backupPrompt.ts` now
      fires once, on the first Journey entry saved (gratitude / nightly /
      spot check / journal), and ONLY when the device isn't actually backing
      up (`cloudAvailable()` false). Silent on a healthy iPhone, since iOS
      backs up from first launch with no setup. To test on Android: fresh
      install, don't touch Settings, save a gratitude list → prompt →
      "Set up backup" → Drive connect → save another entry → no second
      prompt. On iOS it should NOT appear unless you sign out of iCloud.
      Folds into the still-open Drive backup device E2E.
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
- [ ] **Decide the trial/pass-promise mismatch** (found 2026-07-30 pm #3
      while testing): no passes are earned during a trial or intro period
      (`_shared/credits.ts` — `period_type !== 'normal'` skip, deliberate
      since 2026-07-22), but the post-subscribe thank-you sheet greets a
      new annual member with "Five passes to give away." For the whole
      first week Pass It On is empty while the welcome says otherwise.
      Options: (a) soften the copy to say when they arrive, (b) delay the
      sheet until conversion, (c) accept it. Only bites once
      `PASSES_ENABLED` is true.
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
- [ ] **Remote housekeeping** (no urgency, but before launch tidiness):
      delete the orphaned `gifts-purchase` + `gifts-wallet` Supabase edge
      functions; remove the 3 ASC gift consumables + Play IAPs from sale.

## 4. Deferred — explicitly NOT launch blockers (parked)

- RevenueCat-designed paywall swap (after first-round feature testing).
- Onboarding funnel analytics (step-level Mixpanel events; onboarding has
  zero tracking today).
- Bulletproof the grandfather check (fail-open + cached +
  edge-function-backed) — required before any v3 **price increase**, not
  before launch.
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
- Pricing revisit trigger: strong gift-cliff conversion at $4.99/$24.99.
