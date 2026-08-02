# Launch Checklist — Sober Dailies 3.0 public release

Single source of truth for what must happen before the app ships to **end
users** (store release, not testers). Consolidated 2026-07-27 from
SESSION-HANDOFF.md §6 / §11.9 / §12.5 and the memory to-do notes. Check items
off here as they land; when everything in sections 1–3 is done, the app is
clear to ship.

---

## 1. Launch flips & removals (do these at ship time, as one pass)

**⚡ THE FLIPS ARE DONE — RC IS LIVE (2026-08-02, commit `78889bd4`).**
Build 132 / runtime 3.0.8 exists: Android RC APK built + installed on
Neal's phone (all fine-tuning OTAs go `eas update --channel dev`); iOS 132
still needs Neal's interactive build (expired provisioning profile):
`eas build --profile preview --platform ios`. Sections below are kept as
the record of what flipped and what the path is.

**THE SHIP PATH (decided 2026-08-02, Neal):** do all the flips below, bump
runtime to **3.0.8** + build **132**, and build with the **`preview`
profile** (channel `dev`, internal distribution, Android APK) — a
release-candidate fleet of ONE, Neal's devices only, never TestFlight/Play.
Fine-tune with OTAs via `eas update --channel dev` (double-isolated from
testers: different channel AND runtime). When satisfied, build **133** with
the `production` profile and launch. The 3.0.7 tester channel is then
FROZEN: any later OTA to it must first flip local `.env` back to `test` or
it re-tags the tester fleet as production (testers also stay
passes-suspended unless deliberately OTA'd). On the RC, turn **Developer
Mode ON** (Dev Console) so Neal's own sessions don't pollute production
analytics.

- [x] **`PASSES_ENABLED` → `true`** — DONE 2026-08-02 (`78889bd4`). Lives in
      the 3.0.8 RC; the frozen 3.0.7 tester fleet stays suspended.
- [x] **`EXPO_PUBLIC_ANALYTICS_ENV` → `production`** — DONE 2026-08-02 in
      ALL THREE places (local `.env` + EAS `production` + EAS `preview`,
      flipped via CLI and verified). Historical notes kept below: was `test` in
      BOTH the EAS `production`/`preview` environments AND the local `.env`
      (verified 2026-07-31). ⚠️ Flip BOTH: no eas.json build profile
      declares an `environment`, so `eas update` resolves this from the
      LOCAL `.env`, not from EAS. Change one and not the other and the
      failure is silent — the tag is only visible in Mixpanel after the fact.
      ⚠️ Second trap: `EXPO_PUBLIC_*` is inlined at update time and testers
      share channel `production`, so once this is flipped, ANY OTA re-tags
      the tester fleet as production too — unless the store binary is on its
      own runtime (3.0.8, below). Belt and braces: `distinct_id` is the
      device's anonymous/Support ID, so a Mixpanel cohort of tester IDs can
      be excluded from reports regardless of tagging.
      Note: the EAS `development` environment is EMPTY — no Mixpanel token
      (so a dev build sends nothing) and no RevenueCat keys either, so
      subscriptions won't initialise in a `development`-profile build.
- [x] **Remove the Android paywall X (dismiss) button** — DONE 2026-08-02
      (`78889bd4`): both gates back to `__DEV__` only; hard wall both
      platforms in the RC (Neal saw it live during the Android E2E). RE-ADDED
      2026-07-30 for the access-test pass (was removed 2026-07-27): both
      gates are back to `__DEV__ || Platform.OS === 'android'`
      (`app/_layout.tsx`, `components/PaywallScreen.tsx`), so Android
      testers can escape the wall during testing. Revert both gates to
      `__DEV__` only at ship time so store builds on both platforms get
      the hard wall.
- [x] ~~Remove or `__DEV__`-gate the QA "Force New-User (paywall)" toggle~~ —
      **DECIDED 2026-08-02 (Neal): the Developer Console STAYS in production
      builds**, long-press and all. Rationale: the risky pieces are
      server-gated (`dev_pass_granters` allowlist), Force New-User is
      self-inflicted + self-recoverable (its banner says where to turn it
      off), destructive rows confirm first — and the console is load-bearing
      for launch ops (Developer Mode = analytics kill switch on the RC,
      Support ID for support, Check for update). Nothing to remove.
      (Audit 2026-08-01: the old "redeem bypass" no longer exists — the dev
      mock died with the purchased-codes system on 07-20; redemption is fully
      server-validated in `gifts-redeem`. Clause removed.)
- [x] **Bump the runtime version for the store release** — DONE 2026-08-02:
      runtime + version 3.0.8, build/versionCode 132. Store production
      builds will be 133 (132 = the internal RC).
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
      still falls back to the paywall. **B2 VERIFIED 2026-08-01 on Neal's
      iPhone**: grandfathered ID inserted → online launch → Today, then
      airplane mode + cold start → Today (test rows deleted after; first
      attempt without the row "passed" via RevenueCat's cached sandbox sub —
      a trap worth remembering). Never-verified-half (fresh ID + offline →
      paywall) not run; low risk, cache keyed to anonymous_id. B2 in the
      access plan still describes the OLD fail-closed behaviour and needs
      updating.
- [ ] **Day-5 trial reminder: next binary + device E2E** — added
      `expo-notifications`, so the JS is inert until the next build
      (lazy-require keeps old-binary OTAs safe). PREVIEW VERIFIED 2026-08-01
      on Neal's iPhone (build 131): permission prompt + banner + copy all
      work; copy updated same day (app name, short month, trimmed tail —
      uncommitted). Remaining: real-timing E2E, which requires a multi-day
      real-device sandbox trial.
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
- [ ] **End-to-end pass test on real devices** — **ANDROID LEG VERIFIED
      2026-08-02 on the 132 RC**, three full rounds: iPhone send → /get →
      SD code → redeem → wall drops immediately; already-redeemed error
      path seen and readable. Two live-fire bugs found + fixed + OTA'd to
      channel `dev` along the way (`50408cc5` keyboard, `a5874545` RC
      cache — see SESSION-HANDOFF §21). **REMAINING: the iOS recipient
      leg** — Apple offer-code redemption sheet → clean install → no
      paywall flash. Needs a second iPhone; offer codes have no sandbox.
- [x] **Verify the pass spend-half cycle** — PASSED 2026-08-01 on Neal's
      iPhone (SESSION-HANDOFF §11.7): cancel kept the balance at 5, re-give
      returned the SAME token, real send → 4. ⚠️ That send minted a LIVE pass
      link sitting in Neal's Messages — use it as the input for the pass-send
      E2E rather than burning a second pass.
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
      Also orphaned, found 2026-07-31 by diffing deployed functions against
      client references: **`check-grandfather`** (0 refs — the app queries
      `user_profiles` directly) and **`invites-report`** (0 refs). Same
      class as the two deleted; delete when convenient.
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
- A quarterly-pass arrival announcement (currently silent).
- ~~BUY-passes idea~~ — KILLED 2026-08-01 (Neal): passes are an acquisition
  play, not a revenue play; selling them would work against their purpose.
  Don't resurrect.

## 5. Post-launch watch items

- ASC offer-code batches 543009 (monthly) / 543010 (yearly) **expire
  2027-01-20** — remint before then.
- RevenueCat month-4 retention for pass cohorts; `credits-status` logs.
- Pricing revisit trigger: strong gift-cliff conversion at $3.99/$19.99.
