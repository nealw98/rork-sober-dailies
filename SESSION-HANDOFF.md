# Session Handoff — Sober Dailies

_For a fresh chat. Branch `3.0.5-redesign` (tracks `origin/3.0.5-redesign`)._
_Last big session (**2026-07-20**): the GIFT ACQUISITION LAUNCH — Pass It On
pivoted from selling code packs to giving earned "passes" (Apple offer codes,
3 free months, auto-converting). Everything through commit `5b4954a4` is
committed, pushed, deployed, and live on the production OTA (runtime 3.0.7).
**Read §7 FIRST** — it supersedes §§1–3 below, which are kept only as history
of systems that no longer exist. Authoritative spec:
`docs/invite-rewards-design.md` §0 · design surfaces:
`docs/design-brief-gift-surfaces.md`._
_(Historical header, 2026-07-18: build **127** tested on device; Android .aab
submitted to Play.)_

---

## 0. App & workflow

- **App:** "Sober Dailies" — AA/recovery app. Expo SDK 53, RN 0.79, bun, EAS, expo-router. Local-first (AsyncStorage/SQLite); Supabase for read-only content + gift/AI edge functions; analytics = Mixpanel; RevenueCat monetization (entitlement `premium`, custom `PaywallScreen`).
- **OTA:** production clients listen on EAS channel **`production`**, runtime **`3.0.7`** (fixed string; version + runtime both 3.0.7, build 127). `eas update --channel production --message "…"`.
- **Builds:** iOS device/dev via `eas build --profile development -p ios` or `npx expo run:ios --device`. Android sideload APK via the **`preview`** profile (`androidPreview` is broken — missing local credentials).
- **Hard rules:** NEVER commit / push / OTA / deploy without an explicit ask. Typecheck baseline ≈ **116** pre-existing errors (`npx tsc --noEmit`); higher = you broke something. Use Supabase **CLI** (brew, authenticated), not the MCP.
- Simulator caveat: MLKit forces x86/Rosetta sim builds; native pickers hang there and SMS never works on sims — test the invite flow on a real device.

---

## 1. ~~Invite Friends~~ RETIRED 2026-07-20 (history only)

The multi-select invite screen, `modules/contact-multi-picker`, and the send
telemetry are all DELETED — "Share the app" is now the plain native share
sheet (`lib/shareApp.ts`), reachable from Pass It On's neutral share row and
Settings. Simpler won. (The personal, individually-addressed text lives on in
the PASS flow — see §7.)

## 2. ~~Pass It On packs~~ + ~~2b. Gift wallet~~ RETIRED 2026-07-20 (history only)

The purchase screen (3/9/15-month packs), the gift wallet, the shared-state
pill system, `use-gift-wallet`, `lib/giftProducts.ts`, and the
`gifts-purchase` / `gifts-wallet` edge functions are all DELETED — nothing is
purchasable; passes are earned (see §7). The "subscribe-at-redemption via
Apple offer codes" idea this section once REJECTED is exactly what shipped.
Still true: legacy SD-XXXX codes remain redeemable forever via `redeem.tsx` /
"Have a code?" → `gifts-redeem` (also the Android pass path). The 3 ASC
consumables and Play IAPs can be removed from sale whenever — nothing
references them. The old §2's mint-count deploy worry is MOOT.

## 3. ~~Nudge system~~ RETIRED 2026-07-20 (history only)

`GrowthNudges` and the slot schedule are DELETED (Neal: the only pass
reminders are the post-subscribe thank-you and the badged gift icon).
`lib/growthPrompts.ts` survives trimmed to the **use-day clock** only
(`recordUseDay` — called on Today mount — and `firstUseAt`). The **review
lane is UNTOUCHED and still live**: `lib/reviewPrompt.ts` gate = ≥15 days
since first use AND (≥50 check-offs OR ≥60 min literature) AND 30-day
cooldown.

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
- ~~Pass It On pack reveal~~ / ~~multi-select picker limitation~~ — both moot;
  the purchase screen and the picker were deleted in the 2026-07-20 pivot (§7).

## 6. Open items / next actions (rewritten 2026-07-20 post-launch)

1. **Lovable publish** — the website repo (`sober-day-reflections`) is pushed
   through the "passes" copy rename (`f570980`), but soberdailies.com only
   updates when Neal hits Publish in Lovable. Verify /get?g=… shows the pass
   storefront after publishing.
2. **End-to-end pass test on real devices** — send a pass from Neal's phone →
   recipient taps /get → picks a plan → Apple redemption sheet → clean
   install → confirm NO paywall flash (launch waits on subscription load; the
   one QA item that can't be sandboxed — offer codes have no sandbox).
3. **Remote housekeeping (no urgency):** delete the orphaned `gifts-purchase`
   + `gifts-wallet` deployments in the Supabase dashboard; remove the 3 ASC
   gift consumables + Play IAPs from sale; `invites-report` + `invite_sends`
   stay deployed but idle (future share telemetry hook).
4. **Pre-END-USER-ship removals (memory):** QA Force-New-User toggle, redeem
   bypass. (~~gift-24h duration revert~~ — FOUND STILL LIVE and fixed
   2026-07-20: `GIFT_ENTITLEMENT_DURATION` default now `three_month`,
   gifts-redeem redeployed.)
5. **Watch after launch:** ASC offer-code redemptions per batch (543009
   monthly / 543010 yearly, expire 2027-01-20 — remint before then), RC
   month-4 retention for pass cohorts, credits-status logs. Pricing revisit
   trigger: strong gift-cliff conversion at $4.99/$24.99.
6. Deferred (unchanged): RevenueCat-designed paywall swap, onboarding funnel
   analytics, Android Drive-backup OAuth activation. New deferred: BUY
   passes (future release idea — recheck Apple's terms on selling offer
   codes first), quarterly-pass arrival announcement (currently silent; the
   badge appearing is the only signal).

## 7. ✅ GIFT ACQUISITION PROGRAM — LIVE (launched 2026-07-20; the current state)

Authoritative spec: **docs/invite-rewards-design.md §0** (+ its addenda).
Design surfaces: **docs/design-brief-gift-surfaces.md** + the implemented
Claude-design handoff (thank-you sheet, pass-sent sheet, give-vs-share rows).
Everything below is DEPLOYED and on the production OTA through `5b4954a4`.

**The model.** Growth over revenue. Members earn **PASSES** (the unit —
"gifts" was renamed 2026-07-20): annual = 5/yr upfront · monthly = 1 at
signup + 1 per 3 paid months · grandfathered v1 = 5/yr founding members
(default ON in code). A pass = an Apple OFFER CODE: recipient picks a plan
on soberdailies.com/get → "3 months free, then $4.99/mo or $24.99/yr"
(re-priced in ASC, ratio 5.0), auto-converting, cancel anytime. Eligibility
NEW + EXPIRED (Apple itself blocks active subs incl. self-redemption).
Android recipients (~20%) get a classic SD code minted under the sender's
identity instead (3 months via RC promo grant, no auto-convert).

**App surfaces (all live):**
- `app/(main)/pass-it-on.tsx` — hero ("You have N passes to give") + pass
  dots + loading shimmer; rose "Give someone 3 months free" row →
  `giveGift()` (token minted BEFORE the composer; a cancelled text reuses
  the pending token — credits never strand) → contact pick → personal SMS →
  `GiftSentSheet` (rose coin + teal check). Neutral "Share the app" row →
  `lib/shareApp.ts` (native share sheet). No Learn-more, no purchase UI,
  no annual pitch — Neal stripped all of it.
- `components/GiftThankYouSheet.tsx` — post-subscribe announcement
  ("Welcome to the family", 5 coins/1 coin), presented by TODAY on first
  mount via an AsyncStorage pending flag written in PaywallScreen.buy()
  BEFORE the gate drops (the paywall tree dissolves too fast to host it).
  ANNOUNCEMENT vs INVENTORY separation is a decided principle.
- `components/navigation/PassItOnGift.tsx` — header glyph with count badge,
  HIDDEN at zero (the icon appearing IS the notification; the only other
  reminder is the thank-you sheet — nudges are gone).
- Balance: `hooks/use-gift-credits.ts` over `lib/creditsService.ts`
  (cached-first, 15-min TTL, server-authoritative).

**Backend (Supabase, all deployed):** `credits-status` (grant-on-read,
idempotent grant keys, heals every call) · `credits-share` (balance check →
token mint, race-compensated) · `get-dispense` (public, token-auth,
idempotent — first fulfillment wins; pops from `offer_code_inventory`, 500
codes per product loaded, batches 543009=monthly / 543010=yearly, expire
2027-01-20) · `gifts-redeem` (legacy SD codes + Android passes;
`GIFT_ENTITLEMENT_DURATION` default now `three_month` — the QA `daily`
landmine was found and fixed 2026-07-20) · `invites-report` (idle).
Tables: `gift_credit_grants`, `gift_shares`, `offer_code_inventory`,
`invite_sends`, plus legacy `gift_codes`.

**Website (`sober-day-reflections` repo):** /get is the storefront — ?g=token
→ yearly-first plan cards → dispense → Apple redemption redirect (+ manual
fallback, Android SD-code path, graceful invalid/out-of-stock). Legacy
?code= flow intact. NOTE: deploys only when Neal publishes in Lovable.

**Recipient end-to-end:** text → /get → pick plan → Apple sheet →
subscription exists before install → install → normal onboarding → Today,
paywall never renders (gate waits on subscription load). A pass sent to an
existing subscriber isn't burned — the link stays live for whoever uses it
first. Grandfathered recipient who accidentally subscribes = support issue
(cancel; grandfather flag survives).
