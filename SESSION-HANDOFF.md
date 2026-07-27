# Session Handoff — Sober Dailies

_For a fresh chat. Branch `3.0.5-redesign` (tracks `origin/3.0.5-redesign`)._

_Latest session (**2026-07-23**): PASS SUSPENSION + policy decisions,
literature fixes, the restored onboarding DISCLAIMER step, and server-side
disclaimer-acceptance recording. **Read §10 FIRST.** Key correction: the app
is NOT launched — still TestFlight; "production" below means the EAS channel,
not App Store users. An OTA went out 2026-07-22 (group `61c43239`); the
disclaimer-sync work on top is committed but NOT deployed and NOT OTA'd._

_Prior session (**2026-07-22**): the SPOT CHECK REDESIGN — sponsor-driven
4-step guided flow, replacing the defect-chips form (§9). Everything through
`222839c4` (build bump to 128) is committed and PUSHED on `3.0.5-redesign` —
this push also carried §8's previously-local `55ee97a9`. The landscape fix
still needs a native store build (see §8)._

_Prior big session (**2026-07-20**): the GIFT ACQUISITION LAUNCH — Pass It On
pivoted from selling code packs to giving earned "passes" (Apple offer codes,
3 free months, auto-converting). Everything through commit `5b4954a4` is
committed, pushed, deployed, and live on the production OTA (runtime 3.0.7).
**§7** is the authoritative launch state; it supersedes §§1–3, which are kept
only as history of systems that no longer exist. Authoritative spec:
`docs/invite-rewards-design.md` §0 · design surfaces:
`docs/design-brief-gift-surfaces.md`._
_(Historical header, 2026-07-18: build **127** tested on device; Android .aab
submitted to Play.)_

---

## 0. App & workflow

- **App:** "Sober Dailies" — AA/recovery app. Expo SDK 53, RN 0.79, bun, EAS, expo-router. Local-first (AsyncStorage/SQLite); Supabase for read-only content + gift/AI edge functions; analytics = Mixpanel; RevenueCat monetization (entitlement `premium`, custom `PaywallScreen`).
- **OTA:** production clients listen on EAS channel **`production`**, runtime **`3.0.7`** (fixed string; version + runtime both 3.0.7, build 127). `eas update --channel production --environment production --message "…"`.

  ⚠️ **`--environment production` is not optional.** The RevenueCat and Mixpanel
  keys live in EAS server-side env vars, not in a local `.env`. Without the flag
  the CLI reads `process.env` from a `.env` that may not exist on the machine
  you're publishing from, bakes the keys in as `undefined`, and every client
  that pulls the update is stuck at a paywall reading "Missing RevenueCat API
  key env var." (Happened 2026-07-27; recovered with
  `eas update:roll-back-to-embedded --channel production`, which needs two
  force-quit relaunches on the device to take effect.)
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

## 8. Session — 2026-07-21 (Today polish · landscape PDF · parked Big Book text)

**Status: commit `55ee97a9` on `3.0.5-redesign` — pushed 2026-07-22 (rode the
§9 push), still NOT OTA'd.**
Working tree clean. Four shipped changes + one parked branch.

**Shipped in `55ee97a9`:**
- **Debug Console — "Daily action subtitles" toggle** (THIS DEVICE card, under
  Developer Mode). Hides the canned `ACTION_SUBTITLE` tag lines ("Set your
  intention", …) on Today rows, edit mode, and the Add sheet. Default ON;
  persisted to AsyncStorage `dailies_show_subtitles` via the dailies store
  (`showSubtitles` / `setShowSubtitles` on `useDailies`). Neal is deciding
  whether the simpler no-subtitle look wins. User-entered subtitles (sponsor
  name, custom-daily notes) are NOT affected — only the canned defaults.
- **Add sheet — already-added rows dimmed** to `opacity: 0.55` so the still-
  available actions pop on a glance (`DailiesEditSheets.tsx`, both catalogs).
- **Sobriety counter — tighter leading** on the days/breakdown/date block
  (`SobrietyCounter.tsx`: breakdown marginTop 5→2, lineHeight 18→16) so it
  reads as one block.
- **Landscape PDF reader** — the Big Book / 12&12 PDFs now rotate to landscape
  for bigger text; the rest of the app stays portrait. Pieces:
  - `PdfReader.tsx` already unlocked rotation on open (re-locks portrait on
    close). Added: the presenting `<Modal>`s in `twelve-and-twelve.tsx` and
    `BigBookMain.tsx` declare `supportedOrientations={['portrait','landscape']}`
    (iOS Modals ignore rotation without it); the `Pdf` remounts on rotation
    (key) with `fitPolicy` = fit-width in landscape / whole-page in portrait,
    restoring the current page across the remount; horizontal safe-area insets
    scoped to the header chrome only so the page runs edge-to-edge.
  - **NATIVE config (ships with next store build, NOT OTA):** `app.json`
    `ios.infoPlist.UISupportedInterfaceOrientations` now lists Landscape L/R
    (prebuild merges this). The local `ios/Info.plist` + `android/…/Android
    Manifest.xml` were also hand-edited (portrait→landscape / `unspecified`)
    for the current simulator builds — but **`ios/` and `android/` are
    gitignored**, so only the `app.json` change survives a prebuild. ⚠️ The
    JS parts alone do nothing until a native build picks up the orientation
    entitlement — this fix does NOT ride the OTA.

**PARKED: branch `bigbook-text-conversion` (commit `cbb291b8`) — NOT merged.**
A complete-but-unshipped conversion of 13 bundled Big Book PDFs into in-app
text-reader chapters (3rd/4th forewords, all ten Part I stories, appendix-7
Twelve Concepts), wired into the content registry, chapter metadata, and the
Contents TOC (entries flipped `pdf`→`text`; PDFs stay bundled and pdf-search
hits still open the PDF reader). Converter + verifier live in
`docs/essay-text-prototype/`; every doc verified 99%+ word-accurate vs the
independent pdf-search index.
- **Why parked:** Everything AA uses the stricter community norm — text only
  for public-domain 1st/2nd-edition material, facsimile PDFs for anything AAWS
  still owns. Under that line, 9 of the 13 qualify (all Part I EXCEPT Gratitude
  in Action); the 4 risk items are the 3rd/4th forewords, Gratitude in Action,
  and appendix-7. US lapsed-renewal basis: 1st ed PD since 1967, 2nd since
  1983; 3rd/4th copyrighted. Neal wary that asking AAWS invites enforcement on
  what the app already bundles. Decision pending before anything ships.
- **3 known converter bugs to fix before shipping** (documented in the commit,
  fix in `convert-bb.js` then regenerate): drop-cap merge drops the space
  ("Iwas born"); the 1–2 wrap lines beside a drop cap can false-start a new
  paragraph; standalone end-of-line hyphen elements yield "sup plied" joins.
- **Part II stories of 2nd-edition (PD-arguable) origin**, if ever wanted:
  Fear of Fear · The Housewife Who Drank at Home · Physician Heal Thyself! ·
  It Might Have Been Worse · Me an Alcoholic? (the other 12 of Part II + all of
  Part III's newer stories are 3rd/4th-edition, copyrighted).

**Next actions (this session):**
1. Decide `55ee97a9`'s fate — push + OTA (JS-only bits: subtitle toggle, dimmed
   rows, counter leading, and the landscape *JS*) then queue a native build for
   the landscape orientation entitlement to actually take effect.
2. Decide Big Book scope (Everything-AA line = 9 PD stories as text, revert the
   4 risk entries to PDF; or ship all 13) — then fix the 3 converter bugs and
   merge `bigbook-text-conversion`. Nothing here ships until decided.

---

## 9. Latest session — 2026-07-22 (SPOT CHECK REDESIGN — sponsor-driven flow)

**Status: merged into `3.0.5-redesign` (fast-forward, 10 commits `a67bce3a`…`ad7c3e6f`)
+ build bump `222839c4` (iOS buildNumber / Android versionCode → 128, version
stays 3.0.7). All PUSHED. NOT OTA'd — JS-only, so it CAN ride an OTA when Neal
says so (no native changes; Archivo was already bundled).**

**What it is:** `app/(main)/inventory.tsx` rewritten from the situation →
defect-chips → Watch For/Strive For form into a 4-step flow voiced by the AI
sponsor persona (design handoff bundle "Sober Dailies-17.zip", §8 frame I):

1. **Feelings** — fixed per-persona ask + pills (`SPOT_CHECK_FEELINGS`, 10 incl.
   Self-pity) + dashed **"Other…"** pill that opens a short input (30 chars);
   custom feelings join the row and save like fixed ones.
2. **What's going on** — fixed per-persona ask + free text.
3. **Causes & conditions** — LLM-generated question (call 1), skippable.
4. **Summary & suggestions** — LLM summary + bullet cards (call 2), fixed
   persona closing line, **"Keep talking with {name}"** as a tappable card in
   the suggestions column, single **"Done for now"** footer pill. No Back from
   this step (deliberate).

**Key mechanics / decisions (product-confirmed):**
- **Sponsor pills** (Eddie/Sam/Grace, avatar+name) sit under the progress rail —
  tap to switch mid-flow; fixed scripts re-render instantly, the current step's
  LLM content re-runs in the new voice, user inputs never reset. Inherits
  `aa-last-opened-sponsor` (default `supportive`); switching also persists there.
- **Exactly 2 LLM calls per entry** (`lib/spotCheckLLM.ts`, Rork endpoint,
  persona system prompt + task wrapper; THROWS on failure unlike chat's
  `callAI`). Offline fallbacks: step 3 → fixed per-persona generic question
  (`SPOT_CHECK_FALLBACK_QUESTION`); step 4 → plain "ready to save" line, no
  bullets. Flow always completes.
- **No consent UI yet** (deliberate defer — steps 3–4 send feelings+text to the
  LLM; a first-use disclosure is a fast-follow candidate).
- **Storage:** new `SpotCheckEntry` (`types/spotCheck.ts`) on the same
  AsyncStorage key `spot_check_inventories`, CLEAN CUTOVER — Journey skips
  pre-redesign `{situation, selections}` records entirely.
- **Completion fully manual:** saving NEVER calls `dailies.markDone()` (removed
  the old `dailyId` auto-check behavior).
- **Exits:** Done for now → save + close; Keep talking → save + handoff to
  chat; back-out with content → 3-way prompt Keep writing / Discard /
  Save & close. Exits fall back to `/` when there's no back stack.
- **Chat handoff:** entry rides via AsyncStorage key `pending_spot_check_handoff`
  → `sponsor-chat.tsx` reads-and-clears once the store settles (gated on
  `hasLoadedFromStorage`) and injects TWO messages via the store's new
  `injectSpotCheckHandoff`: a `kind:'spotCheckCard'` message (rendered by
  `components/SpotCheckCard.tsx`) + a bot opener seeded from the step-4 summary
  (no third LLM call). `convertToAPIMessages` skips card messages when
  replaying history; the first-user-message system-prompt attach is now
  flag-based (was index-0-fragile).
- **Journey** (`use-notebook.ts` + `journey.tsx`): feed previews `whatsGoingOn`
  with a feelings-count label; read sheet shows feeling chips, what-was-going-on,
  the causes Q&A, and a teal "What {sponsor} heard" card (summary + suggestion
  checks); Edit covers user-authored fields only (feelings/whatsGoingOn/
  causesAnswer) — the LLM record is read-only. `updateSpotRecord` signature
  changed accordingly.
- **Extracted `components/SponsorSwitchSheet.tsx`** from sponsor-chat's inline
  dropdown (sponsor-chat behavior unchanged; the spot check screen itself uses
  inline pills, not the sheet — the sheet extraction stands on its own).
- **Chat timestamps:** every turn in sponsor-chat now shows a small muted time
  (right-aligned under user bubbles, left under bot). Quirk: persona welcome
  messages are stamped at app load (module constant `Date.now()`), so they show
  today's time — hide-on-welcome is a tiny follow-up if it grates.

**QA state:** typecheck clean (baseline unchanged); step 0/pills/sponsor-switch
re-voicing verified via simulator screenshots. **Full interactive run (LLM
steps, handoff card in chat, save-to-Journey round trip) NOT yet click-tested**
— simulator tap tooling was blocked (`sudo xcode-select -s
/Applications/Xcode.app/Contents/Developer` needed once), and the paywall gates
dev launches (verification used a temporary local `PAYWALL_ENABLED=false`,
reverted, never committed). Two seeded test records sit in the iPhone 16 Pro
Max sim's spot-check storage (a Salty Sam sample + an invisible old-shape one).

**Next actions:**
1. Real-device / tap-through QA of the full flow incl. offline fallbacks and
   the chat handoff; then decide whether to OTA (JS-only, safe) or hold for the
   build-128 store submission (which the landscape fix in §8 needs anyway).
2. Consent/disclosure line for the LLM steps (deferred, fast-follow).
3. Optional niceties: hide timestamp on welcome messages; Notebook detail could
   surface the sponsor avatar; old-shape records are invisible by design —
   confirm nobody misses them.

---

## 10. Latest session — 2026-07-23 (pass suspension · literature fixes · disclaimer)

**Status: commits `a873d8ec`…`508ead1e` PUSHED + OTA'd to production channel
2026-07-22 (update group `61c43239`, runtime 3.0.7, message "Suspend passes
for TestFlight; search/PDF/highlight fixes; disclaimer step"). The
disclaimer-ACCEPTANCE-RECORDING work on top is committed this push but NOT
deployed / NOT OTA'd. Neal has NOT yet device-tested any of it.**

**Decisions (Neal):**
- **The app is NOT launched — still TestFlight.** Prior "live/production"
  language means deployed infra + the EAS production channel, not store users.
- **Passes are for PAYING subscribers only.** A pass recipient earns nothing
  during the 3 free offer-code months; grants land at first real charge
  (grant-on-read picks them up). Opt-out before conversion = no passes ever.
- **Pass recipients must be NOTIFIED when passes land** (open follow-up):
  agreed design = server-driven announcement — thank-you sheet when
  credits-status returns balance above last-announced — replacing the
  PaywallScreen.buy() pending-flag path. NOT BUILT YET.
- Share-count-based pass awards REJECTED (gameable; the free "Share the app"
  row covers organic spread). Redemption-based bonus passes = future lever,
  decide from post-launch data.
- v2's welcome disclaimer returns as an onboarding step (below), with 988.

**Shipped in the 2026-07-22 OTA:**
- **Pass kill switch:** `PASSES_ENABLED = false` in `lib/creditsService.ts` —
  balance reads 0 (badge + give-row hide), no server calls, no token minting,
  pending thank-you announcements swallowed; pass-it-on hero forced to the
  neutral 'none' copy. **FLIP TO TRUE AT LAUNCH.**
- **Server grant gates** in `supabase/functions/_shared/credits.ts`: skip
  `is_sandbox` subs (CRITICAL — TestFlight sandbox subs were minting real
  production offer codes) and skip non-`normal` `period_type` (the
  paying-only rule). ⚠️ **Edge functions NOT redeployed** — the gates aren't
  live until `supabase functions deploy credits-status credits-share`.
- **Big Book search fix:** result taps now pass `paragraphId` through
  Contents → Main → HtmlReader; the reader centers the matched paragraph and
  pulses `.search-hit` marks (plus first-hit fallbacks). Was: scrolled to the
  page anchor, term often off-screen.
- **PDF rotation fix:** `PdfReader` passes the stashed page as the native
  `page` prop on the orientation remount (the old post-load `setPage` raced
  the view's own scroll-to-1 and lost). Post-load jump kept as offset
  correction.
- **Highlight UX:** pressing Highlight just records + renders; the note
  editor no longer auto-opens. Tap the highlighted text for note/delete
  (that menu already existed).
- **Onboarding disclaimer step** (`components/OnboardingFlow.tsx`): restored
  as the FINAL step (dailies → disclaimer → completeOnboarding), full-screen
  on `obvGrad(0.5)`, reusing the retained `consent*` styles. Copy: title
  "Before you begin", subtitle "A word about safety.", the three v2 bullets
  with 988 added, Terms/Privacy links, checkbox "I understand the above, and
  have read and agree…" gating Continue. Existing devices that completed
  onboarding never see it.

**Committed THIS push (not deployed, not OTA'd): disclaimer acceptance
recording.** `lib/disclaimerConsent.ts` (local timestamp + best-effort server
sync, launch-time retry via `ensureDisclaimerSynced()` in `app/_layout.tsx`,
version const `1-2026-07-22`) → new edge function
`supabase/functions/disclaimer-accept` → new table `disclaimer_acceptances`
(migration `20260722100000`, PK (anonymous_id, version), first-accept wins,
RLS no-policies). Typecheck baseline: **131** pre-existing (drifted from the
documented 116 — verified pre-existing via stash) **+4** Deno-noise errors
from the new edge function = **135**.

**Website repo (`sober-day-reflections`, pushed):** `docs/privacy-policy.md`
+ `docs/support.md` — accurate, app-grounded source content for Lovable to
rewrite /privacy and /support (existing pages are July-2025 stale). Support
doc covers Today, backup/restore, multi-device (last-write-wins caveat),
passes, literature, AI disclaimer + 988, troubleshooting.

**Next actions:**
1. **Deploy server side:** `supabase db push` (disclaimer_acceptances
   migration) + `supabase functions deploy credits-status credits-share
   disclaimer-accept`. Then an OTA so clients actually send acceptance.
2. **Device QA** (Neal, on the OTA'd build): pass surfaces gone · search
   lands on term · PDF keeps page through rotation · highlight = no modal,
   tap-to-note · fresh-install onboarding shows the disclaimer step.
   (Plus the §9 spot-check flow QA, still outstanding.)
3. **Build the pass-arrival notification** (server-driven thank-you; see
   decisions above) — the agreed replacement for the buy-flag path.
4. **Neal's dev pass stash** (approved, awaiting go): insert
   `(anonymous_id, 'dev_stash_2026_07', N)` into gift_credit_grants; need his
   anonymous_id (founding_y1 rows or a Debug Console read-out) — note
   sending also needs PASSES_ENABLED true or a debug bypass.
5. Launch checklist additions: flip `PASSES_ENABLED`, deploy gates (item 1),
   Lovable-publish the rewritten website pages.
