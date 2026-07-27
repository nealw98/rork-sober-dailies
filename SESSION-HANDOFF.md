# Session Handoff — Sober Dailies

_For a fresh chat. Branch `3.0.5-redesign` (tracks `origin/3.0.5-redesign`)._

_Latest session (**2026-07-25…27**): the milestone/birthday takeover, the PDF
and gratitude fixes, Developer Console pass grants, and a full audit of what is
actually deployed. **Read §11 FIRST** — it verifies build/OTA/Supabase state
against the services rather than the notes, and supersedes §§8–10's next
actions. Standing correction: the app is NOT launched — still TestFlight;
"production" throughout means the EAS channel, not App Store users._

_Prior session (**2026-07-23**): PASS SUSPENSION + policy decisions,
literature fixes, the restored onboarding DISCLAIMER step, and server-side
disclaimer-acceptance recording (§10). The disclaimer-sync work is committed
but still NOT deployed as of §11's audit._

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
4. ~~**Neal's dev pass stash**~~ — SUPERSEDED by the Developer Console grant
   button + `dev_grant_passes` RPC (§11, runbook §7).
5. Launch checklist additions: flip `PASSES_ENABLED`, deploy gates (item 1),
   Lovable-publish the rewritten website pages.

---

## 11. Latest session — 2026-07-25…27 (milestone takeover · dev pass grants · state audit)

**Status: head `b5b63c60` on `3.0.5-redesign`, all pushed. Working tree clean
except untracked `docs/app-store-feature-spec.md`.** This section supersedes
§§8–10's "next actions" where they conflict. Everything below was verified
against EAS / Supabase on 2026-07-27, not taken from notes.

### 11.1 On devices now (production OTA, runtime 3.0.7)

- **PDF reader page-jump race fix** + page-number rows in both books' search
  modals (`7d3539a8`, OTA `fc38c7f4`). `currentPageRef` was seeded with the
  *target* page, so the restore loop's "already there" guard passed before any
  jump ran — search/go-to/bookmark jumps and rotation restores all landed on
  the chapter start. Shared `PdfReader.tsx`, both platforms, with Neal's
  explicit go-ahead (the iOS freeze otherwise still stands).
- **Spot Check recap cards** body font 13 → 14px (`309ef1f4`).
- **Gratitude living-list rework** (`e940edbe`): the composer prefills today's
  saved items as editable fields; Save merges the whole visible list, fixing
  save-clobbers-the-morning-list data loss. Prefill reads `getSavedEntry` so
  Journey deletes are respected. Clearing every field = Cancel, not delete-day.
- **Daily Reflections inline `*emphasis*` parser** (`8448a167`) — the real
  Supabase text carries asterisk markup.
- **Birthday/milestone work** (`659495f0`…`315075eb`): Today badge, full-screen
  iMessage-style confetti takeover (brand gradient, Lottie, synthesized chime
  that respects the silent switch, haptics, Reduce Motion fallback), replay on
  tap, and a full-bleed milestone band that shares `gradients.celebration` with
  the takeover so the two can't drift.
- **Developer Console pass grants + Pass It On composer change**
  (`5f884f3a`…`b5b63c60`), OTA'd 2026-07-27. See §11.4.

### 11.2 Binaries — build 130

Both platforms built 2026-07-26 from commit `315075eb`, `production` profile,
STORE distribution, runtime 3.0.7. What only these binaries carry (NOT OTA-able):
the `react-native-pdf` landscape patch (`b274e9ec` — kills the horizontal
wiggle), `lottie-react-native` for the confetti, the API-36 targets +
`edgeToEdgeEnabled`, and iOS buildNumber 129 → 130.

- **iOS 130 — submitted to TestFlight** ✅
- **Android 130 — built, NOT uploaded to Play.** Build `3dbe5e12` (7/26) is the
  one to upload; it supersedes `a7561f19` (7/24), which predates the milestone
  work. The Expo dashboard's Download button was a no-op for Neal — the direct
  artifact URL works (`eas build:list --json` → `applicationArchiveUrl`;
  artifacts expire ~30 days out).
- **Android edge-to-edge visual QA still pending** — `edgeToEdgeEnabled`
  changes insets on ALL Android versions (status bar, floating tab band, FAB,
  modals), so this needs a real look on the open-test track before promoting.

### 11.3 Server state — ✅ DEPLOYED 2026-07-27 (was three open items)

**All three migrations applied and all three functions deployed** (verified via
`supabase migration list` / `functions list`): `credits-status` v3,
`credits-share` v3, `disclaimer-accept` v1, all stamped 2026-07-27 18:48 UTC.
Local and remote migration history now agree completely — **the drift is
gone.** The historical detail below is kept because it explains the placeholder
files and the Lovable relationship, both of which still matter.

✅ **Repair done (Neal, 2026-07-27).** The push ran BEFORE `20260727110000` was
amended to restate `set search_path = public`, so the live
`gift_credit_balance` was replaced without the pin, silently reverting Lovable's
20260724 hardening. Re-pinned by hand:
`ALTER FUNCTION public.gift_credit_balance(text) SET search_path = public;`
The migration file on disk carries the SET clause, so a future fresh apply is
correct too. **Standing rule this produced: before any `CREATE OR REPLACE
FUNCTION`, check `20260724185725` to see whether the advisor pinned that
function — Postgres resets attributes the new definition omits.**

⚠️ **Server and client are now OUT OF STEP until the OTA.** `credits-share` v3
counts only delivered shares, but the shipped client never calls
`confirm_sent` — so on any current build a send is never counted and the
balance does not decrease. Contained (`PASSES_ENABLED=false` globally; only the
override device can send), but ship the client half before any real sending.

✅ **Sandbox-grant cleanup DONE (Neal, 2026-07-27).** With the gates live, the
single contaminated `annual_y1` row was deleted and will not heal back. The
ledger is now 4 legitimate `founding_y1` rows and nothing else. The whole
sandbox-contamination incident is closed: no Apple codes were ever dispensed,
no links were ever delivered, and the grant that caused it is gone.

<details><summary>Historical: the audit and the push blocker (2026-07-27)</summary>

- **`credits-status` / `credits-share` last deployed 2026-07-20 21:39.** They
  predate BOTH the 7/22 sandbox + free-period gates and the 7/27
  promotional-store gate. This is why a TestFlight sandbox yearly minted a real
  `annual_y1` grant. `supabase functions deploy credits-status credits-share`.
- **Two migrations are local-only** (confirmed via `supabase migration list`):
  `20260722100000` (disclaimer_acceptances) and `20260727100000`
  (dev_pass_grants). The Developer Console grant button cannot work until the
  latter is applied.
- **`disclaimer-accept` has never been deployed** — it isn't in
  `supabase functions list` at all.
- Drift note: remote carries `20260724185725` and `20260724185823` with no
  local counterpart (dashboard-applied). Local history no longer describes the
  remote schema.

**✅ The push blocker is RESOLVED (2026-07-27) — but the push itself has not
run yet.** `supabase db push` refused with "Remote migration versions not found
in local migrations directory" (both plain and `--include-all`). The two
documented escapes were rejected: `migration repair --status reverted` records
something FALSE (those migrations did run; only the history row would go), and
`supabase db pull` needs Docker, **which is not installed on this Mac** — so
`db dump`/`db pull` are both unavailable here.

**The fix used instead — no Docker, no remote mutation:** two local migrations
were created at Lovable's versions,
`20260724185725_lovable_dashboard_applied.sql` and
`20260724185823_lovable_dashboard_applied.sql`. Their versions now exist on
both sides so the history check passes; being already-applied, push skips them.
**Neal supplied the real SQL from the dashboard and both files now record it
verbatim** (commented — it already ran, and several objects it references were
themselves dashboard-created, so it would fail against a fresh DB).

**What Lovable's 2026-07-24 migrations actually did:** Security Advisor
hardening — pinned `search_path` on `invite_sends_report`,
`gift_credit_balance`, `dispense_offer_code`; revoked EXECUTE on six
trigger-only SECURITY DEFINER functions; restricted `dispense_offer_code` and
`gift_credit_balance` to `service_role`; restricted three analytics RPCs and
`has_role` away from `anon`.

**APP IMPACT: none** (audited 2026-07-27 across the codebase). `dispense_offer_code`
is called by get-dispense via `serviceClient()`; `invite_sends_report` likewise;
`gift_credit_balance` is only reached through `dev_grant_passes`, which is
SECURITY DEFINER. Everything else touched has zero app references. Unlike the
2026-07-14 advisor migration, nothing broke.

**⚠️ BUT IT NEARLY BROKE SOMETHING GOING FORWARD — caught before the push.**
`CREATE OR REPLACE FUNCTION` resets any attribute the new definition omits, so
`20260727110000`'s replacement of `gift_credit_balance` would have silently
stripped the `SET search_path = public` the advisor had just added, quietly
reverting the fix. The migration now restates `set search_path = public`.
**Rule: whenever replacing a function, check `20260724185725` first to see
whether the advisor pinned it.**

Verified with `supabase db push --dry-run --include-all`: exactly the three
intended migrations would apply. `--include-all` is required because the
disclaimer migration (dated 07-22) sorts before the remote's newest.

All three are also fully idempotent (`create table if not exists` ·
`add column if not exists` · `create index if not exists` ·
`create or replace function` · `drop function if exists`), so re-running is
harmless and pasting them into the SQL editor remains a valid fallback.

**Safety review of the three (2026-07-27) — all safe to apply:**
- `20260722100000` disclaimer — additive table, RLS on with no policies. Inert
  until `disclaimer-accept` is deployed.
- `20260727100000` dev pass grants — `SECURITY DEFINER` reviewed:
  `search_path` is pinned to `public, pg_temp` (the critical protection),
  input is bounded 1–25, the allowlist check fails closed, and
  `gift_credit_balance` (its one dependency) already exists on remote. The
  dropped `grant_manual_passes` has no callers. **Ships with an EMPTY
  allowlist, so it is inert on arrival** — see the caveat below.
- `20260727110000` sent_at — nullable column (no table rewrite), partial index
  on a 3-row table, both idempotent.

**⚠️ Caught during review and FIXED in `20260727110000`:** `gift_credit_balance`
(SQL) counted ALL gift_shares while the new `getCreditState` (TS) counts only
delivered ones. `dev_grant_passes` returns the SQL one and the Developer
Console caches it, so the grant button would have reported 4 while the next
status refresh reported 5. The migration now replaces the function to match.

**⚠️ USAGE caveat for `dev_pass_granters` — not a reason to withhold the
migration, but know it before adding a row.** Verified 2026-07-27: the anon key
can enumerate **every `anonymous_id` in `user_profiles` in plaintext** (the
column-scoped grant from `20260715` plus a `USING (true)` policy), and
`dev_grant_passes` is granted EXECUTE to anon. So anyone with the bundled anon
key can walk all 612 ids calling the RPC until one is allowlisted, then mint 25
credits at a time — and `credits-share` trusts a client-supplied
`anonymous_id`, so those credits convert to REAL Apple offer codes.
**Mitigation, free: keep the allowlist EMPTY except for the minute you are
actively granting.** Grants are permanent, so deleting your
`dev_pass_granters` row afterwards keeps the passes and closes the hole.

**🔎 ROOT CAUSE of the drift, found 2026-07-27: Lovable is a SECOND WRITER to
this database.** The marketing site (`sober-day-reflections`) carries
`supabase/config.toml` with `project_id = "uzfqabcjxjqufpipdcla"` — the app's
production project — which is what lets Lovable's Supabase integration apply
migrations to it. That is where `20260724185725` / `20260724185823` came from,
and the naming matches the already-documented `20260714162725_701f30f7-…`
"Supabase Security Advisor fixes" migration **that paywalled every
grandfathered user in production** (§ the 20260715 restore migration).
So this has caused one outage already and has written twice more since,
unreviewed.

**The website does not need that access.** Verified: the web repo has **no
`@supabase/supabase-js` dependency**, and its entire Supabase surface is one
plain `fetch` to `/functions/v1/get-dispense` in `src/lib/gift.ts`. Zero table
access, zero client library, zero migrations.
`src/integrations/supabase/client.ts` is dead Lovable scaffolding (it cannot
even work without the missing dependency). Disconnecting Lovable's Supabase
integration therefore costs the site nothing and removes the second writer.

**Recommended order (understand → stop the bleeding → reconcile):**
1. **Read what the July 24 migrations did** — Dashboard → Database →
   Migrations. Given the July 14 precedent, assume something may be silently
   broken until proven otherwise.
2. **Disconnect Lovable's Supabase integration** (Lovable project settings),
   and drop `supabase/config.toml` + the dead `src/integrations/supabase/`
   from the web repo so it cannot re-link.
3. **Reconcile with `supabase db pull`, NOT `migration repair`.** With a second
   writer in the picture, `repair --status reverted` would erase the only
   record that Lovable's changes exist. `pull` captures them into the app repo,
   after which the three pending migrations push normally.

Also note: the anon key is hardcoded in the website's source as well as the app
bundle — a third public copy of the key that grants the `user_profiles` read
below.

</details>

**⚠️ Separate pre-launch finding (independent of these migrations):**
`credits-share` and `credits-status` authenticate by nothing but a
client-supplied `anonymous_id`, and those ids are anon-enumerable. Today that
is moot (`PASSES_ENABLED=false` client-side, and the only balances are the
sandbox grants being deleted), but **at launch it means anyone can spend any
member's passes.** The fix is to stop trusting the body's `anonymous_id` — bind
it to something the client can prove. Belongs on the launch checklist.

### 11.4 Manual pass grants (2026-07-27)

The Developer Console — renamed from Debug Console — has a **Grant 5 passes**
button that writes `gift_credit_grants` rows keyed `manual_<utc iso>`, a shape
`computeEarnedGrants` never produces, so grant-on-read can neither collide with
nor re-trigger them. It started as a `credits-grant` edge function and was
replaced by a `SECURITY DEFINER` RPC (`dev_grant_passes`) guarded by a
`dev_pass_granters` allowlist table — setup is one SQL paste, nothing to
deploy. The button also flips the device-local passes override on, so a grant
is immediately sendable while `PASSES_ENABLED` stays false for everyone else.
Full procedure: `docs/gift-program-runbook.md` §7.

Also this session: Pass It On's give button now opens the Messages composer
with a blank To: field (drops the contact picker — you can hand someone a pass
at a meeting without adding them to Contacts), and RC promotional pseudo-
products (`rc_promo_premium_three_month`/`_yearly`) now skip the earn loop
outright — they matched `classifyProduct`'s regexes, so a gift recipient's free
grant would have earned them a `monthly_signup` credit.

### 11.5 Sandbox grant contamination — cleanup, and the order it must happen in

Every subscription during the TestFlight period is a sandbox subscription, so
**every earned grant currently in `gift_credit_grants` is an artifact**, not a
real member's entitlement.

**Grant-on-read self-heals, so ORDER MATTERS: deploy the gated functions
FIRST, delete the rows SECOND.** Deleting while the 7/20 deploy is still live
just recreates the rows on the next `credits-status` call from that device.

**Ledger contents, measured 2026-07-27** — the whole table is 5 rows:

| grant_key | rows | credits |
|---|---|---|
| `annual_y1` | 1 | 5 | ← the sandbox contamination, DELETE |
| `founding_y1` | 4 | 20 | ← legitimate, KEEP |

The 4 founding grants date from the 2026-07-20→22 window when passes were
briefly live (grant-on-read only fires when a client calls `credits-status`,
and `PASSES_ENABLED=false` has blocked that since). They are correct by design,
and deleting them would be pointless — founding eligibility doesn't depend on a
subscription, so they heal straight back. Some may be Neal's own reset
identities; harmless either way, since a grant is only spendable from the device
that holds it.

Post-delete the affected device reads `0 granted − 0 delivered shares = 0` —
the negative balance feared earlier is moot now that `sent_at` is live and its
one unsent token no longer counts.

Scope of the cleanup — earned keys only:

```sql
delete from gift_credit_grants
where grant_key ~ '^(annual_y[0-9]+|monthly_signup|tenure_[0-9]+)$';
```

- **Leave `founding_y1`.** Grandfathered v1 members are granted by design with
  no purchase behind them (`foundingEligible` gates on `is_grandfathered`), and
  deleting them is pointless anyway — they don't depend on a subscription, so
  they heal straight back.
- **Never blanket-delete `manual_*`.** Those are the only rows with no source
  to heal from; deleting one is permanent.
- The deletion is safe precisely because of the self-heal: for earned keys the
  table is a cache, not a ledger of record. Any genuinely paying member's
  grants regenerate on their next status call.

**Audit finding 2026-07-27: ZERO Apple offer codes dispensed, and the 3 share
tokens were never sent.** The dispensed-code query returns no rows (verified
via a `left join`, which can't drop rows — the table genuinely has no
`dispensed_at`), while `count(*) from gift_shares` = 3. Neal confirms he opened
the composer three times and cancelled each text. So the contamination never
left the building: no link is in anyone's hands, nothing is claimable, no
Apple code left inventory, nothing was redeemed. Note this is NOT the
`never_claimed` bucket — these were never even delivered.

A token row with no text behind it is the DESIGNED state, not debris:
`getShareLink()` mints the token BEFORE the composer opens and stashes it at
`gift_pending_share_v1`; `confirmShareSent()` clears that slot only when the
text actually goes out. A cancelled compose therefore leaves a pending token
that the NEXT give reuses instead of minting a fresh one — the credit is held
in escrow, never stranded.

**The 3 shares, identified.** All three carry a DIFFERENT
`sender_anonymous_id` and a null `android_gift_code` (so all took the iOS
offer-code path):

| when (UTC) | sender | context |
|---|---|---|
| 2026-07-20 21:46 | `96d68afd…` | 7 min after credits-status/share were deployed |
| 2026-07-20 22:19 | `e97daa5f…` | 33 min later, new identity |
| 2026-07-27 14:54 | `4dfaa418…` | today, via the new device-local override |

Three identities for three self-tests is expected, not three real users: the
Developer Console's **Reset Subscription State clears the anonymous id**, so
each reset-and-retest cycle mints a new sender.

**Balance arithmetic — `shares_used` is per sender.** `getCreditState` filters
gift_shares by `sender_anonymous_id`, so each of those three devices carries
exactly ONE share, not three. Under the OLD rule that cost today's device a
credit (a grant of 5 would have read 4). **§11.7 removes that** — once the
`sent_at` migration is applied (§11.7), all three rows read as unsent, stop
counting, and a grant of 5 reads 5 with the pending token usable on top.

**Recommendation: delete nothing.**
- **Today's row (`pdv5x4tb…`) must stay.** `PENDING_KEY` is a single slot and
  that device holds this token; deleting the server row turns the next give
  into a dead `/get` link.
- The two 7/20 rows are inert — different identities, never sent, and after
  §11.7 they cost nothing. Leave them as audit trail.

### 11.6 Unchanged / confirmed

- Pre-ship flags all still in QA state, as intended: `PASSES_ENABLED = false`
  ([lib/creditsService.ts:25](lib/creditsService.ts:25)),
  `EXPO_PUBLIC_ANALYTICS_ENV=test`, the Android paywall X
  ([app/_layout.tsx:279](app/_layout.tsx:279),
  [components/PaywallScreen.tsx:234](components/PaywallScreen.tsx:234)), and
  `QA_FORCE_NEW_USER_KEY` ([hooks/useSubscription.ts:27](hooks/useSubscription.ts:27)).
- **Website: published in Lovable and up to date** (Neal, 2026-07-27) — §6
  item 1 is closed.
- Decision on record ([[session-handoff-api36-sdk-upgrade-assessment]]): the
  Expo SDK 54 upgrade is the NEXT release train, nothing before 3.0.7 ships.

### 11.7 A pass is spent on DELIVERY, not on composing (2026-07-27)

**Decision (Neal):** "I shouldn't use up a pass by creating a message with a
link but by sending it." Implemented, UNCOMMITTED, not deployed.

The token must be minted before the composer opens — the link has to exist to
go in the text — so `gift_shares` rows counted against the balance the moment
the composer appeared. Cancelling left the row and the credit spent. The
pending-token reuse hid the worst of it (the next give reuses the unsent token
instead of minting a second) but never returned the credit, so the balance
under-reported what the member could actually give. The scarce asset is the
Apple offer code, and that only leaves inventory when a recipient opens `/get`
— an unsent link costs nothing, so charging for one was the wrong hook.

**Considered and rejected: pre-minting all N tokens at grant time.** It doesn't
avoid the fix (you still need a per-row sent marker to know which are used, i.e.
the same column), and it costs more: every token is a live claimable link, so
outstanding links per member go from 1 to N; and minting isn't idempotent, so
grant-on-read — the reason the system needs no cron and heals itself — would
have to carry "does this member already have their five?" state.

Changes:
- `supabase/migrations/20260727110000_gift_shares_sent_at.sql` — adds
  `sent_at timestamptz` + a partial index on (sender, sent_at not null).
  Existing rows stay NULL deliberately: all three were composer cancels.
- `_shared/credits.ts` — `getCreditState` counts only `sent_at not null`.
- `credits-share` — new `action: 'confirm_sent'` branch, idempotent via the
  `sent_at is null` guard and scoped to the sender so a leaked token can't
  drain someone else's balance. The old check-then-insert race compensation is
  REMOVED: the insert no longer moves the balance, so it could never fire.
- `lib/creditsService.ts` — `confirmShareSent()` stamps the server, then clears
  `PENDING_KEY`. It clears the slot **even when the stamp fails**: the
  recipient already holds that link and reusing it would hand two people the
  same token (get-dispense is idempotent per token, so both land on the SAME
  offer code). Failed stamps queue at `gift_unstamped_sends_v1` and retry from
  `fetchCreditStatus()`.

**Accepted failure mode:** a send whose confirm never lands (offline, or the
share-sheet fallback which doesn't report completion reliably) goes uncounted —
one extra pass given. Unfixable at `confirm_sent` by nature, since the text is
already delivered, and over-giving is the cheap direction to be wrong in for a
~$0 acquisition asset. Typecheck 135 = baseline, no new errors.

### 11.8 Sending a pass to someone already covered (verified 2026-07-27)

Two cases, and they go opposite ways.

**Active paying subscriber — Apple protects them.** The code IS popped from
inventory and bound to their token when they pick a plan (that happens before
Apple sees anything), then Apple refuses the redemption: an Apple ID with an
active subscription can't redeem an offer code for it. The Apple code stays
unredeemed, and `get-dispense` is idempotent per token, so re-opening the link
returns the same code — forward it to someone eligible and it still works. The
code is locked to that one link, though, and won't be handed to another token.
The sender's pass was spent at send time.

**Grandfathered v1 member — nothing protects them, and the flag is NOT at
risk.** Grandfather access is `user_profiles.is_grandfathered`, a computed
column that is true when `created_at` is before **February 4, 2026** — it has
no relationship to subscriptions, so nothing about redeeming can revoke it.
Premium resolves as `isEntitled || isGrandfathered || isPremiumOverride`
([hooks/useSubscription.ts:179](hooks/useSubscription.ts:179)), an OR, so a
grandfathered member who redeems simply holds both. Cancel the sub and
grandfather still carries them; access is never lost.

So the damage is financial and relational, not entitlement: they get 3 free
months of what they already had, then auto-convert to $4.99/mo or $24.99/yr —
a founding member quietly paying for a promise you already gave them free.

**Why it's likely to go unnoticed:** because access is an OR, their in-app
experience is byte-identical before and after. Nothing in the app indicates
they are now paying, so there is no prompt to cancel.

Not detectable at send time: the composer opens with a blank To: field, so the
sender's app never learns who the recipient is, and grandfather status lives on
the recipient's device against their own anonymous_id. `/get` can't tell either
— nobody is authenticated there.

Mitigations, neither built:
- **Website copy on `/get`** — "already using Sober Dailies? You don't need
  this." Catches most of it, ships without an app release.
- **In-app notice** — the one place the truth is knowable is the recipient's
  own device, and RC gives it everything needed. An offer code redeemed in
  Safari attaches to the Apple ID; the next `getCustomerInfo()` (already called
  at init) populates `entitlements.active['premium']`, which carries
  `periodType` (`NORMAL | INTRO | TRIAL | PREPAID` — verified in
  `@revenuecat/purchases-typescript-internal`), `willRenew`, and
  `expirationDate`. So the precise trigger is:

  `isGrandfathered && isEntitled && periodType !== 'NORMAL' && willRenew`

  — i.e. a founding member sitting in a free window that is still set to
  convert. `expirationDate` is the deadline to name in the copy, and the card
  self-dismisses when `willRenew` flips false after they cancel. Test
  `!== 'NORMAL'` rather than for a specific value; that is what the server
  already keys on in `_shared/credits.ts`. OTA-able, no release needed.

  ⚠️ Depends on `checkGrandfatherStatus()`, which is an uncached live Supabase
  read that returns false on any error. For a warning that fails closed (show
  nothing) that is the safe direction, but a flaky read means a missed window —
  another reason for [[todo-bulletproof-grandfather]].

Decide before flipping `PASSES_ENABLED` — grandfathered members are exactly who
early senders will think of first.

**Does a LAPSED member (app deleted) keep grandfather? Platform-dependent.**
Grandfather is looked up by `anonymous_id`, so the real question is whether that
id survives an uninstall (`lib/anonymousId.ts`):
- **iOS — yes.** SecureStore is the Keychain, which survives app deletion. Same
  id → same `user_profiles` row → still grandfathered. So a lapsed iOS member
  who redeems a pass is the SAME hazard as an active one.
- **Android — maybe.** expo-secure-store writes SharedPreferences encrypted
  with the Keystore; uninstall wipes both. But `getAnonymousId()` also mirrors
  the id to AsyncStorage (`anonymous_id`) and falls back to it when SecureStore
  is empty, and `allowBackup: true` is set in expo-build-properties — so
  Android Auto Backup can restore it. Auto Backup is best-effort (Google
  account, Wi-Fi, ~daily, restores only at install time), so treat it as a
  coin-flip, not a guarantee. No restore → brand-new UUID → a profile dated
  today → NOT grandfathered, and a pass is then genuinely useful to them.
- **Either platform:** restoring an iCloud/Drive/manual backup calls
  `adoptAnonymousId()`, which exists precisely to carry identity — its doc
  comment names grandfather status as one of the things it preserves.

**Population, measured 2026-07-27** (via the anon key's column-scoped read on
`user_profiles` — `anonymous_id` + `is_grandfathered` only):

| | count |
|---|---|
| grandfathered | **415** |
| not grandfathered | 197 |
| total profiles | **612** |

⚠️ **These are DEVICE IDENTITIES, NOT PEOPLE.** But the totals reconcile far
better than an Apple-only comparison suggests:

| source | count |
|---|---|
| App Store first-time downloads (lifetime) | 333 |
| Play total installs (2026-07-23) | ~256 |
| **combined installs** | **~589** |
| `user_profiles` rows | 612 |
| excess | **~23 (≈4%)** |

A 4% excess is about what dev/simulator installs and TestFlight testers would
produce on their own — neither appears in App Store first-time downloads, but
both mint an `anonymous_id`. So wholesale duplication is NOT indicated at the
total level.

**Android launched 2025-10-10** (Neal), i.e. ~117 days before the grandfather
cutoff — so it can plausibly supply the pre-cutoff installs the count needs.
212 installs over the 262 days to 2026-06-29 = **0.81/day lifetime average**,
against 1.83/day recently, so growth accelerated and the early period ran
slower than average:

**RESOLVED — Play Console says Android cumulative installs were 31 at the v2
release on 2026-02-01** (Neal, read from a longer date range in the console;
the exported CSV's Notes column is empty and it only spans Jun 29–Jul 26).
That is three days before the cutoff, so Android supplies ~31 grandfathered
identities, not the ~82 needed.

**MEASURED — the App Store daily export
(`sober_dailies_aa_toolkit-first_time_downloads-20251004-20260726.csv`) settles
it.** iOS launched 2025-10-04; lifetime 333 first-time downloads, of which
**155 fall before the 2026-02-04 cutoff** (151 before Feb 1 — the cutoff is
Feb 4, not the Feb 1 v2 release date) and **178 after**.

| | real installs | DB rows | error |
|---|---|---|---|
| grandfathered (pre-cutoff) | 155 iOS + 31 Android = **186** | 415 | **+229 (2.2× inflated)** |
| post-cutoff | 178 iOS + 225 Android = **403** | 197 | **−206 (missing)** |
| total | **589** | 612 | +23 |

**So ~229 of the 415 grandfathered rows — over half — are phantom.** Far worse
than the 51–111 I estimated before knowing the iOS split. The real
grandfathered population is **~186 device identities**.

**Grandfathered are ~32% of lifetime installs (186/589), NOT the 68% this
section originally reported off raw DB rows.** That reverses the earlier
conclusion: sending a pass to someone already covered is a minority case among
existing users, not the modal one.

⚠️ **iOS has NOT flatlined** — 178 downloads since the cutoff versus 155 before,
roughly 1/day and steady. An earlier draft of this section inferred a dormant
listing from the reconciliation model; the real data says otherwise. Android
(1.83/day) is the faster channel, not the only one.

Careful with mixed metrics: "418 installed base" = 333 iOS *lifetime downloads*
+ 85 Android *current base*, which are different quantities. Lifetime installs
across both stores is 589. The true CURRENT base needs **iOS active devices**,
which the first-time-downloads export does not contain — still unpulled.

**Why the ~23 total excess hid this: two opposite errors cancelling.** The
pre-cutoff bucket is over-counted by duplicates (≥51), while the post-cutoff
bucket is UNDER-counted by 28–68 — real post-cutoff installs are ~225–265
against only 197 rows. Rows are written by the sobriety-date sync, and
`syncSobrietyDate` was removed from the client while anon INSERT on
`user_profiles` was revoked in the 2026-07-14 hardening — so recent installs
largely produce no row at all, and anyone who never set a sobriety date never
had one. Net +23 is a coincidence, not a clean bill of health.

**`user_profiles` is therefore duplicated early and gappy late. Do not use it
as a population count for anything.**

**Churn matters more than the duplicate question anyway.** Play reports a
cumulative 256 installs against an installed base of **86 — 34% retention**.
Applying that to the Android grandfathered cohort leaves **~10 grandfathered
Android identities still installed**. Two consequences:
- The Android grandfather-loss-on-reinstall risk flagged below is real but
  SMALL — it can touch at most 31 identities, ~10 of them current. Downgrade it
  from "production risk" to "known defect, low blast radius".
- For the pass hazard, what matters is ACTIVE grandfathered users, not rows. If
  iOS retention resembles Android's (likely better, but unmeasured here), the
  live grandfathered population is in the low hundreds at most — still probably
  the majority of active users, but nothing like 415.

Still worth pulling: **iOS active devices**. Android's base is known (86 of 256
= 34% retention), iOS retention is not. Grandfathered active share will be
BELOW 32%, since that cohort is the oldest and has had the longest to churn.

### 11.8.1 BOTTOM LINE — the exposure is small; act accordingly

**Absolute ceiling on the grandfathered-pays-anyway hazard: 186 people**, and
only if not one of them ever churned. Real exposure is far smaller, because
harm needs FOUR things to line up: be grandfathered (≤186) · still be active
(Neal's estimate: total MAU < 50) · be sent a pass · actually redeem it.
Realistically that is **single digits, plausibly zero for a good while**.

**DECIDED 2026-07-27 (Neal): ship NOTHING for this. Accept the exposure.**

Both candidate mitigations were built and then reverted, deliberately. Do not
rebuild either without new evidence — the reasoning, not the code, is the
artifact worth keeping.

- ❌ **In-app notice — built, deleted.** Someone who reads a warning and
  subscribes anyway has made a choice, and a modal on Today is a real UX cost
  imposed on a user whose experience is otherwise fine. The argument that seals
  it: **the check cannot distinguish a mistaken redemption from a founding
  member who deliberately chose to pay in order to support the app.** Telling
  that person "you don't need this subscription" during their free window
  actively talks them out of paying — a false positive costing more than the
  miss it prevents, against single-digit exposure.
- ❌ **`/get` copy — strengthened, then reverted to the original.** The stronger
  version ("redeeming this starts a paid subscription you don't need") reads as
  a trap to the page's ACTUAL audience: a newcomer who was just handed 3 free
  months by a friend. `/get` exists to convert that person. Emphasising the
  subscription over the free offer sacrifices the primary funnel to guard an
  edge case. The original soft line stands:
  *"Already a Sober Dailies member? Pass this link along — the pass goes to
  whoever uses it first."*

**This leaves the grandfathered-redeems case essentially unmitigated** beyond
that soft line, and that is the conscious call, not drift: exposure is single
digits, the flag itself is never at risk (access is an OR and survives), and
**support is the backstop** — cancel the sub, grandfather carries them, refund
if Apple already charged.

Near term the social rule covers it anyway — passes are suspended, the only
sender is Neal's override device, and early senders will be him and a few
testers. Just don't send passes to existing members.

⚠️ MAU < 50 is Neal's estimate, not measured. Mixpanel could confirm it, though
`EXPO_PUBLIC_ANALYTICS_ENV` is still `test` — see the launch flips.

Second hypothesis worth ruling out with the monthly histogram below: a bulk
`created_at` cluster on a single early date would mean rows were backfilled or
migrated, not organically signed up — which would inflate grandfathered without
any duplicate devices at all.

Remaining duplicate sources, if the query says duplicates exist:
1. **Dev/QA installs** — fresh simulator, wiped device, or Reset Subscription
   State each mint a new id; three of Neal's show up in `gift_shares` alone.
2. **One human, several rows** — the id is per device-install, Apple's metric
   is per Apple account (iPhone + iPad = 1 download, 2 rows). Reinstalls before
   the SecureStore migration also minted new ids; the AsyncStorage fallback in
   `lib/anonymousId.ts` exists because older builds stored it there only.
3. **Android reinstalls** — still mint duplicates today (see below).

⚠️ Data-quality note on `Downloads/Total installs.csv`: it interleaves TWO
monotone series — the real one (212→256 over Jun 29–Jul 23) and a second one
appearing exactly every 3rd day (60→86). The 3-day cadence cycles through all
weekdays, so it is an export artifact, not a weekly effect. Use the 212→256
series; find out what the other is before quoting it.

Also: rows were written by the sobriety-date sync, and anon INSERT was revoked
in the 2026-07-14 hardening and never restored — so `user_profiles` has been
**frozen since 2026-07-14**. It is a historical log of device identities that
synced a sobriety date, not a census of current users.

**Do not quote 415 as a user count.** The real grandfathered population may be
far closer to the download figure. What matters for the pass hazard is the
covered-to-uncovered RATIO among people a sender might pick, which these
numbers cannot establish. Dedupe before relying on any of it — the third query
is the real test, since sobriety_date + timezone fingerprints one human across
installs:

```sql
select date_trunc('month', created_at) as month, count(*)
from user_profiles group by 1 order by 1;

select count(*) filter (where sobriety_date is null) as no_sobriety_date,
       count(*) as total from user_profiles;

select sobriety_date, timezone, count(*) from user_profiles
where sobriety_date is not null
group by 1, 2 having count(*) > 1 order by count(*) desc limit 30;
```

**The list is CLOSED.** `is_grandfathered` is computed as `created_at <
2026-02-04`, so nobody created after that date can ever join it. It stopped
growing in February 2026; 415 is final and can only shrink. The exact last
signup needs the dashboard — `created_at` is deliberately outside the anon
grant:

```sql
select count(*) filter (where is_grandfathered) as grandfathered,
       count(*) as total,
       max(created_at) filter (where is_grandfathered) as last_grandfathered,
       max(created_at) as newest_profile
from user_profiles;
```

⚠️ **Independent of passes, this is a production risk:** an Android founding
member who reinstalls without an Auto Backup restore silently loses free-forever
access and hits the paywall — same user-visible failure as the July 2026 RLS
incident ([[prod-incident-rls-grandfather-paywall]]), different cause. Nothing
recovers it but a backup restore or a support-side fix. Strengthens the case for
[[todo-bulletproof-grandfather]].

### 11.9 Next actions

1. `supabase db push` — applies all THREE local-only migrations
   (`20260722100000` disclaimer, `20260727100000` dev pass grants,
   `20260727110000` gift_shares.sent_at) — then `supabase functions deploy
   credits-status credits-share disclaimer-accept`. The `sent_at` client half
   (§11.7) also needs an **OTA** to reach devices; the migration and function
   must land FIRST, or `confirm_sent` 400s and every send queues for retry.
2. THEN the sandbox-grant cleanup in §11.5. Order matters — grant-on-read
   heals deleted rows back until the gated functions are deployed.
3. Allowlist Neal's device in `dev_pass_granters` (device id from Developer
   Console → THIS DEVICE → Device ID), then the grant button works.
4. Upload `3dbe5e12` to Play; edge-to-edge QA on the open-test track.
5. Launch flips, when it's time: `PASSES_ENABLED` → true (+ OTA),
   `EXPO_PUBLIC_ANALYTICS_ENV` → production, strip the Android paywall X and
   the QA force-new-user toggle, bump runtime for the store release (3.0.8
   recommended).

**Test for §11.7 once deployed:** grant 5 → give → cancel the composer →
balance still **5** (was 4) → give again → same token reused → actually send →
balance **4**, `sent_at` set on that row only.
