# Session Handoff — Sober Dailies

_For a fresh chat. Branch `3.0.5-redesign` (tracks `origin/3.0.5-redesign`)._
_Last big session (2026-07-18): Invite Friends + Pass It On pricing rework + nudge system + v2-migration fixes. Build bumped to **127** (native rebuild required — see §1)._

---

## 0. App & workflow

- **App:** "Sober Dailies" — AA/recovery app. Expo SDK 53, RN 0.79, bun, EAS, expo-router. Local-first (AsyncStorage/SQLite); Supabase for read-only content + gift/AI edge functions; analytics = Mixpanel; RevenueCat monetization (entitlement `premium`, custom `PaywallScreen`).
- **OTA:** production clients listen on EAS channel **`production`**, runtime **`3.0.7`** (fixed string; version + runtime both 3.0.7, build 127). `eas update --channel production --message "…"`.
- **Builds:** iOS device/dev via `eas build --profile development -p ios` or `npx expo run:ios --device`. Android sideload APK via the **`preview`** profile (`androidPreview` is broken — missing local credentials).
- **Hard rules:** NEVER commit / push / OTA / deploy without an explicit ask. Typecheck baseline ≈ **116** pre-existing errors (`npx tsc --noEmit`); higher = you broke something. Use Supabase **CLI** (brew, authenticated), not the MCP.
- Simulator caveat: MLKit forces x86/Rosetta sim builds; native pickers hang there and SMS never works on sims — test the invite flow on a real device.

---

## 1. Invite Friends (NEW — needs build 127 to fully work)

- **Screen `app/(main)/invite.tsx`**, entry = "Invite Friends" row (rose, UserPlus icon) in Settings' **Pass It On** group. Deliberately NOT on the Pass It On purchase screen.
- **Permissionless by design** (iOS 18's "Select Contacts / Share All" sheet was rejected as a confusing double-selection): iOS uses a **custom local native module `modules/contact-multi-picker`** — `CNContactPickerViewController` with the plural `didSelect contacts:` delegate = the system multi-select picker, zero contacts permission. Falls back to `presentContactPickerAsync` single-pick (Android + binaries predating the module), then to the share sheet (no SMS / iPad).
- Sending = **sequential individual `expo-sms` composers** (never a group text — anonymity). Message: `"I've been using Sober Dailies. Give it a try:\n\n" + getUrl()` (soberdailies.com/get — site IS published). iOS reports per-send `sent`/`cancelled` → Mixpanel `invite_friends` events.
- **`expo-sms` and the picker module are lazy-required with fallbacks**, so OTAs of this JS to pre-127 binaries degrade instead of crashing. The module's Swift has never been compiled locally — first compile happens on the EAS build; fix errors from the build log if any.

## 2. Pass It On — bank-of-months + final pricing

- **Framing:** you fill a **bank of months**, given away as 3-month codes (mechanically identical to the code wallet — pure copy layer). Wallet counter "30 of 30 months to give" + "Each code unlocks 3 months"; Settings row shows months; CTA "Add N months".
- **Purchase screen:** only the "3 months · $9.99 · $3.33/month" card on load; "Give more and save" reveals "9 months · $19.99 · only $2.22/month"; then "Want more?" reveals "15 months · $29.99 · only $2.00/month · Best deal". Footnote notes the $3.99/month subscription for comparison (live monthly price via `getOfferings`, fallback `MONTHLY_PRICE_FALLBACK`).
- **⚠️ ASC product IDs were REPURPOSED (immutable):** `gift_3mo_single`=3mo/1 code, **`gift_3mo_pack5`=9mo/3 codes**, **`gift_3mo_pack10`=15mo/5 codes**. Suffixes no longer match counts — `GIFT_SKUS.n` and the server's `GIFT_PRODUCTS` map are the truth. ASC reference names are "3/9/15 months", status Prepare for Submission.
- **⚠️ `supabase/functions/_shared/gifts.ts` has the new mint counts but is NOT DEPLOYED** — deployed server still mints 5/10. Deploy before testing any pack purchase.
- Pricing philosophy: codes are **acquisition, not revenue** (redemption = 90-day funnel into the paywall at expiry; promotional entitlements can't auto-convert — subscribe-at-redemption via Apple offer codes was considered and REJECTED for now; expiry-nudge + post-gift paywall variant are noted future work).
- Gift redemption is unconditional (no card, nothing renews) — that's the product's soul; don't re-propose trial-conversion at redemption.

## 3. Nudge system (NEW — `lib/growthPrompts.ts` + `components/GrowthNudges.tsx` on Today)

- **Growth lane (promotion):** ONE alternating schedule in **use-days** (distinct days opened): slot every 30 use-days to 180, then every 90 — **30 invite · 60 gift · 90 invite · 120 gift · 150 invite · 180 gift · 270 invite …** Each slot fires once ever; one growth nudge per session.
  - Invite = inline rose card under the sobriety counter ("Know someone who could use this?"), persists until dismissed/acted.
  - Gift = bottom sheet at app open; requires ≥60 days sober or the slot **downgrades to an invite card**; wallet-aware copy (unshared months → wallet, else → purchase screen). One showing consumes the slot.
- **Review lane (separate — "not direct promotion"):** `lib/reviewPrompt.ts` gate = ≥15 days since first use (`firstUseAt()`) **AND** (≥50 lifetime daily check-offs **OR** ≥60 min cumulative literature reading — fed by `useScreenTimeTracking` for 'Big Book' / '12 Steps & 12 Traditions' / 'Meeting Reading') **AND** 30-day cooldown. Triggers unchanged (positive moments); OS caps ~3/yr. No coupling to the growth lane.
- Mixpanel: `growth_nudge` {type, action: shown/tap/dismiss, threshold}.

## 4. v2→v3 migration fixes + Journey

- **Backfill bug FIXED:** the run-once `dailies_v2_backfill_v1` flag fired against an empty store on fresh installs *before* Backup & Restore imported v2 data, then never retried. Flag removed — backfill runs every load, idempotent (never overwrites an existing date; **past days only** — today belongs to the live store).
- **v2 Nightly Review = ONE Journey entry** (decided): the notebook card now carries the v2 "Daily Actions" checklist (`checks` on NotebookEntry; checklist-only reviews render too). The synthetic "x of 6" legacy day cards are GONE from Journey; the backfilled `v2` completion records remain underneath purely for the **Trends action-bridge** (streaks/heatmap unchanged). Collision (v2+v3 same date): v3 owns the day card, the v2 review is its own entry.

## 5. Smaller items this session

- **Meditation:** scene carousel → **pills** (all scenes visible; chip row like LENGTH). **Opening bell** rings 0.5s after Begin (phase-guarded), same bell as completion.
- **Big Book selection toolbar:** iOS swallows the touchend when a native handle-drag takes over → the "finger down" latch stuck and the action bar never reappeared. Fixed with pointerup/pointercancel listeners + a bounded defer (~1s). Device-test.
- Contacts permission string in app.json updated (covers inviting; contacts never leave the device). No flow requests full contacts access anymore.

## 6. Open items / next actions

1. **EAS build 127** (both platforms): compiles `expo-sms` + the multi-picker Swift for the first time. Invite E2E (multi-pick → per-person composers) is device-only.
2. **Deploy edge functions** (mint counts, §2) before any pack-purchase test.
3. ASC: 3 gift consumables are "Prepare for Submission" — attach to the next app submission.
4. Pre-END-USER-ship removals (memory): QA Force-New-User toggle, gift-24h duration revert (already reverted? verify), redeem bypass.
5. Deferred: RevenueCat-designed paywall swap, onboarding funnel analytics, Android Drive-backup OAuth activation, expiry-conversion funnel for gift recipients.
