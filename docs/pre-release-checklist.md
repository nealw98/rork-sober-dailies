# Pre-release checklist

Two lanes. **Lane A** is what a *tester* build needs — almost nothing, because the
QA affordances exist for testing. **Lane B** is the store-submission sweep, where
those same affordances have to come out. Don't do Lane B early: it makes your own
testing harder and buys nothing.

Last reviewed: 2026-07-26.

---

## Lane A — before a TESTER build

- [ ] **Commit `app.json`.** The API-36 / versionCode work is uncommitted, so a
      build made today can't be reproduced from git. This is the one that bites
      when a tester files a bug against a binary you can no longer rebuild.
- [ ] **Check `buildNumber` (iOS).** TestFlight rejects a duplicate. The known
      bump was versionCode 130 for Android — confirm the iOS side moved too.
- [ ] Build both platforms. This binary is the first that can exercise:
      - Lottie confetti on the milestone takeover (native dep, never shipped)
      - the react-native-pdf landscape patch (`patches/`, never shipped)
      - a real-device sandbox purchase (impossible on simulator)

Everything below stays **as-is** for a tester build — on purpose.

---

## Lane B — before STORE submission

### Code that must change

- [ ] **Remove the Android dismissible-paywall X.** `__DEV__ || Platform.OS === 'android'`
      in `app/_layout.tsx` (~line 279) and `components/PaywallScreen.tsx` (~line 234).
      Added because the Android test track has no Play license testers, so Billing
      is unavailable and the wall would be unescapable. Real users must not have it.
- [ ] **Remove or `__DEV__`-gate the QA "Force New-User" toggle.**
      `QA_FORCE_NEW_USER_KEY` in `hooks/useSubscription.ts`, surfaced in the Debug
      Console. It bypasses grandfather + entitlement checks — a paying-user-facing
      hole if it ships.
- [ ] **Flip analytics to production.** `EXPO_PUBLIC_ANALYTICS_ENV=test` in `.env`
      → `production`. Applies to the build *and* any OTA published after it, or
      launch metrics land in the test bucket.
- [ ] **Verify `PAYWALL_ENABLED = true`** in `app/_layout.tsx` (~line 117). It gets
      flipped for local testing; it must be `true` in anything shipped.
- [ ] **Confirm `PASSES_ENABLED`** in `lib/creditsService.ts` is intentional.
      Currently `false` (gift program off). If it stays off, the Pass It On screen
      shows only the neutral subscriber line — that's the state that's been designed.

### Release mechanics

- [ ] **Bump version + runtime to 3.0.8.** Give the store binary its own runtime
      rather than sharing 3.0.7 with old tester builds — the two have different
      native layers (lottie, PDF patch), and sharing a runtime is how you get an
      OTA that assumes native code half the binaries don't have. Keep the single
      `production` channel; EAS targets channel + runtime, so 3.0.8 updates reach
      only store-class binaries.
- [ ] **Converge testers onto the release binary.** Push the same build to
      TestFlight and the Play open-test track when you submit. Within days everyone
      is on 3.0.8 and one hotfix OTA reaches all of them. Stragglers stay frozen on
      the last 3.0.7 update — not broken, just static.

### Outside the app

- [ ] **Publish `soberdailies.com/get` on Lovable.** "Share the app" links straight
      to it (`lib/shareApp.ts`). The UA gating there is what stops Android
      recipients from burning paid Apple offer codes irreversibly. Verify on a real
      iPhone *and* a real Android before the app goes live.
- [ ] **Play Data Safety form** — already submitted 2026-07-15; re-check if any new
      data collection landed since.

### Verify on device (not simulator)

- [ ] Sandbox purchase end-to-end (still pending from earlier sessions).
- [ ] Trial copy matches the real store/RevenueCat config — the paywall hardcodes
      "7 days" / "Start my free week".
- [ ] Landscape PDF: rotate mid-chapter, confirm the page holds and doesn't drift
      sideways (that's the patch this binary is the first to carry).
- [ ] Milestone takeover: confetti renders, chime audible with the ringer on and
      silent with the switch off.
- [ ] Android edge-to-edge under API 36.

---

## Explicitly deferred (not release blockers)

- Grandfather-check hardening (fail-open + cached + edge-function-backed) — worth
  doing before any price increase, not before this release.
- Onboarding funnel analytics — onboarding currently emits zero events. You'll want
  this soon after launch to see where people drop.
- Code audit / cleanup pass — orphaned `redeem.tsx`, dead release flags, broken EAS
  profiles, ~135 tsc errors, 343 MB archive with no `.easignore`.
- Gratitude dual-store reconciliation — deleting a day in Journey leaves a second
  copy that still counts toward weekly progress.
- Expo SDK 54 upgrade — decided: next release train, post-3.0.7.
- RevenueCat-designed paywall swap.
