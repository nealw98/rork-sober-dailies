# Session Handoff — Sober Dailies

_For a fresh chat. Branch `3.0.5-redesign` (tracks `origin/3.0.5-redesign`)._
_Last big session (2026-07-18): Invite Friends + Pass It On pricing rework + nudge system + v2-migration fixes + Debug Console redesign + Call-my-sponsor daily + wallet shared-state. Build **127** built + tested on device (multi-select picker works); the 127 **Android .aab is submitted to Play**; latest OTA on production runtime 3.0.7 covers everything through commit `1d4a70ac` (plus one uncommitted ledger tweak — see §2b)._

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
- **Store product setup:** Play IAPs are LIVE-configured (names "3 Months - 1 Gift Code" / "9 Months - 3 Gift Codes" / "15 Months - 5 Gift Codes" — fits Apple's 30-char display-name cap; use the same strings in ASC). Play products are NOT tied to builds (active immediately); the three ASC consumables ("Prepare for Submission") must ride the iOS 127 submission. Screen sells months, sublines + payment sheet disclose codes — decided framing.

## 2b. Gift wallet — shared-state (commits `5fbf384a`, `1d4a70ac` + one uncommitted tweak)

- Codes carry a local-only `sharedAt` (`gift_shared_v1`, in Backup SYNC_KEYS, merged like notes). ONE pill, three lifecycle states: **Share** (rose) → **Shared** (gray outline; tap = confirm re-share — same code, fresh message, "only the first person to redeem gets the months") → **Redeemed** (teal + date). iOS marks shared only on a real send; Android on sheet-open (can't tell).
- Counter = "**N months to give**", counting **UNSHARED** codes only — the "of N" total was removed (meaningless). Adaptive subline: unshared>0 → "Each code unlocks 3 months"; all out → "All your codes are out — watch for redemptions."; all redeemed → "Every gift found a home."
- `unsharedCount` feeds every "months to give" surface: wallet counter, Settings row, Pass It On wallet link, gift nudge copy.
- **UNCOMMITTED:** ledger reverted from three groups back to ONE list ("YOUR CODES" — shared codes stay in place with the gray pill; the rose/gray mix is the at-a-glance state) + RECEIVED for redeemed. GiftInfoSheet gained a "Need to send it again?" step. Commit+OTA on Neal's word.

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
- **Debug Console redesigned** (commit `3cd1d0e3`): ALL developer/QA actions moved off the Settings page into the hidden console (long-press the version number) — app-styled per Neal's mock: version/platform cards, THIS DEVICE (dev-mode toggle, check-update/restart), PAYWALL & SUBSCRIPTION (force-new-user w/ ON/OFF badge, reset subscription, paywall previews), ONBOARDING & DATA (the three former Settings rows; they close the console before firing — iOS modal stacking), log feed w/ Copy/Clear pills.
- **"Call my sponsor" daily** (`callSponsor` in TOOL_CATALOG, steel/phone): sponsor = ONE contact stored in `lib/sponsorContact.ts` (`sponsor_contact_v1`, in Backup SYNC_KEYS; separate from Reach Out's list). First press → permissionless contact picker, then straight into the sheet; after that → action sheet Call / Text / Change sponsor. Sponsor's name renders as the row subtitle on Today. Completion stays manual. Mixpanel `sponsor_reached`.
- **Add-daily sheet:** "Create your own" moved to the TOP (was buried under both catalogs). TOOL_CATALOG re-sorted **alphabetically by TOOL noun**, not verb label: Another alcoholic, Evening prayers, Gratitude, Journal, Literature, Meditation, Meeting, Morning prayers, Nightly review, Speaker tapes, Sponsor, Spot check.
- **Pass It On:** "Give more and save" reveals BOTH pack cards at once (two-stage "Want more?" removed).
- **KNOWN LIMITATION (accepted):** Apple's multi-select contact picker has **no search field** (single-select does) — uncustomizable system UI; the A–Z index rail is the navigation. Package labels ("3/9/15 months") are HARD-CODED in `GIFT_SKUS`; only prices come live from the store.

## 6. Open items / next actions

1. ~~EAS build 127~~ DONE — built both platforms, tested on iOS device, **Android .aab submitted to Play**. Multi-select picker works; note it has NO search field (Apple limitation, accepted — A–Z rail only; single-select picker keeps search).
2. **Deploy edge functions** (mint counts, §2) — STILL PENDING and now urgent-ish: deployed server mints the OLD 5/10 counts for the repurposed pack IDs, so any real pack purchase over-mints until this ships. One `supabase functions deploy` on Neal's word.
3. ASC: 3 gift consumables are "Prepare for Submission" — attach to the iOS 127 submission (Play needs nothing; its products are live-configured).
3b. Commit + OTA the uncommitted single-list ledger tweak (§2b).
4. Pre-END-USER-ship removals (memory): QA Force-New-User toggle, gift-24h duration revert (already reverted? verify), redeem bypass.
5. Deferred: RevenueCat-designed paywall swap, onboarding funnel analytics, Android Drive-backup OAuth activation, expiry-conversion funnel for gift recipients.

## 7. ⚠️ STRATEGIC PIVOT (2026-07-20, decided with Neal in a separate session): Pass It On → pure acquisition

Authoritative spec: **docs/invite-rewards-design.md §0**. Read it before touching
Pass It On / gift-wallet / paywall pricing. Headlines:

- Gift codes are now an ACQUISITION channel, not revenue. Recipients get Apple
  OFFER CODES ("3 months free, then $4.99/mo or $24.99/yr") picked on
  soberdailies.com/get; the /get storefront is BUILT (sober-day-reflections repo).
- **Pricing settled: $4.99/mo + $24.99/yr** (already changed in ASC; ratio-5.0
  annual steering). Update GIFT_SKUS/paywall fallbacks when touching that code.
- Givers earn **credits** (annual 5/yr, monthly 1 per 3 paid months,
  grandfathered 5/yr): the wallet becomes "N gifts to give"; sharing mints a
  token link, never a raw code. **"Buy more" is DEAD** — the §2 pack-purchase
  flow and its mint-count deploy concern are superseded (open item 2 above is
  now mostly moot; legacy SD codes stay redeemable).
- Backend BUILT (migrations 20260719/20260720 + credits-status, credits-share,
  get-dispense, invites-report edge functions), all undeployed/uncommitted.
- **Phase 3 (app) is the remaining build:** wallet → credits UI + share flow
  (invite-picker pattern → SMS with /get?g=<token> link); retire the pack
  purchase UI; keep the legacy code ledger for outstanding purchased codes.

(Design work on these surfaces: see docs/design-brief-gift-surfaces.md.)
