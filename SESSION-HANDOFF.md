# Session Handoff — Sober Dailies

_For a fresh chat. Branch `3.0.5-redesign` (tracks `origin/3.0.5-redesign`)._

_Latest session (**2026-07-31, #2**): **build 131 built on both platforms**
(iOS auto-submitted; Android AAB in `~/Downloads/sober-dailies-3.0.7-131.aab`,
runtime deliberately still **3.0.7** — 3.0.8 is reserved for the launch binary
132). Also: the Literature TOCs got **one find row** (live search + solid
bookmark + highlights, all rendering ON the page, no bottom sheets), and saving
a Journey entry now **confirms where it went** — an Alert titled "Saved to your
Journey" with View / OK, with the one-time backup nudge queued after it. The
nightly review keeps tonight's answers like the gratitude list does. **All
committed and pushed (head `aa6dafba`), but ⚠️ the last OTA was published at
`dffbf985` — the six save-confirmation commits after it are UNSHIPPED.** The
missing Android paywall X was NOT a bug (build 130 predates the re-add; 131 has
it). **Read §19**, especially 19.7 (four things committed but never seen
running) and 19.8 (next actions). §18 is the same day's earlier work._

_Prior sessions: **2026-07-31 #1** = §18 (Big Book front-matter audit,
grandfather never walls, pricing $3.99/$19.99, privacy published).
**2026-07-30 pm #3** = §17. Prior to that (**pm #2**): the **ACCESS TEST PLAN**
(`docs/ACCESS-TEST-PLAN.md`) — the launch-gating test pass for
onboarding/subscription/grandfather/codes, grounded in a fresh code map;
Android paywall X RE-ADDED for testing (revert at ship, LAUNCH-CHECKLIST §1);
thank-you sheet copy finalized + Developer Console previews for it. The
crash fix from the prior session is now COMMITTED (`caefd00b`). **§16.**_

_Prior session (**2026-07-30 pm**): **POST-PURCHASE CRASH — every purchaser on
build 130 was crashing** the moment a purchase completed (`expo-notifications`
missing from the binary; Metro turns a module-init throw into a fatal, so the
existing try/catch could never catch it). Fixed, shipped as OTA #4
`c3bb402d`, and now committed (`caefd00b`); on-device confirmation is still
outstanding. **Read §15**, including §15.2 (a try/catch around `require()`
does not work — where it runs decides), §15.5 (the Force New-User toggle is
Keychain-backed and can brick a device) and §15.7 (the purchase/redemption
review that was started, with 11 findings to carry forward)._

_Prior session (**2026-07-30**): TOC row standard + 3 production OTAs (§14)._

_Prior session (**2026-07-27 pm**): Today/reader UI polish (UNCOMMITTED),
the day-5 trial reminder (NEW native dep → next binary), prod-incident #2
fixed (anon storage LIST restored + the Lovable→prod-DB write-path closed on
both sides), and the /get gift page reworked + PUBLISHED via the new Lovable
MCP connection. **§12 for today's uncommitted tree; §11 remains the deploy/
state audit.**_

_Prior session (**2026-07-25…27**): the milestone/birthday takeover, the PDF
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

✅ **Client half SHIPPED — server and client are back in step.** Two prod OTAs,
runtime 3.0.7, both platforms, both published WITH `--environment production`
and both verified rather than assumed (the exported bundles carry the real
`appl_` / `goog_` RevenueCat keys and the Mixpanel token, so neither repeats
the 2026-07-27 keyless-bundle outage):
- `bb57f4a7-4684-4258-a866-cc5af7245d6a` — commit `0a5a3aa2`, "Passes spend on
  delivery, not on opening the composer".
- `1ca80a6b-1389-45be-a4bd-156dbfbe5299` — commit `29b6a637`, "Gift badge
  refreshes on focus".

**Both commits are LOCAL — not pushed.**

⚠️ **NO MORE OTAs until Neal calls it** (2026-07-27): he has minor changes
accumulating and wants them bundled into one publish rather than drip-fed to
testers. See [[commit-ota-only-when-asked]] — an OTA authorization covers one
publish, not the follow-up fix.

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

**🔎 ROOT CAUSE of the drift, 2026-07-27 — corrected by Neal.** The marketing
site (`sober-day-reflections`) carries `supabase/config.toml` with
`project_id = "uzfqabcjxjqufpipdcla"`, the app's production project, so
Lovable's security scanner sees the APP's database.

**Not rogue automation — Neal ran the fixes himself.** An earlier draft here
called Lovable a "second writer" applying migrations unreviewed; that was
wrong. Lovable surfaces the scan findings and **sometimes requires them
resolved before it will publish the site**, so clicking Fix is part of shipping
a website change. `20260724185725` / `20260724185823` came from that, as did
`20260714162725_701f30f7-…` — the one that enabled RLS on user_profiles and
**paywalled every grandfathered user in production** (see the 20260715 restore).

**So the real hazard is coupling, not automation:** the WEBSITE's publish gate
can require schema changes to the APP's database, decided by a scanner that
knows nothing about what the app reads with the anon key. Turning off
"Auto-fix security issues" does not address it — the pressure arrives through
the publish flow. Nor is "don't run the fixes" right: the 07-24 fixes were
genuinely good and broke nothing (audited below); it is the 07-14 one that
shows what happens when a scanner hardens a table the app depends on.

**It also loops the other way.** An app migration that replaces a function
without restating `SET search_path` reverts the scanner's fix, so the next
website publish re-flags it — exactly what `20260727110000` nearly did to
`gift_credit_balance`. Guard note lives in `20260724185725`.

**The website does not need that access.** Verified: the web repo has **no
`@supabase/supabase-js` dependency**, and its entire Supabase surface is one
plain `fetch` to `/functions/v1/get-dispense` in `src/lib/gift.ts`. Zero table
access, zero client library, zero migrations.
`src/integrations/supabase/client.ts` is dead Lovable scaffolding (it cannot
even work without the missing dependency). Disconnecting Lovable's Supabase
integration therefore costs the site nothing and removes the second writer.

**What to actually do about it (revised after Neal's correction):**
- **Decoupling is still right, for a better reason.** The site's entire
  Supabase surface is one unauthenticated `fetch` to `/functions/v1/get-dispense`
  — no `@supabase/supabase-js` dependency, no table access. If the Lovable
  project has no Supabase connection, there is no database for the scanner to
  flag and no schema gate on publishing the website. Removing
  `supabase/config.toml` + the dead `src/integrations/supabase/` from the web
  repo closes the second, repo-side path. ⚠️ Verify first that disconnecting
  doesn't itself block publishing — that is the one unknown.
- **If it stays connected: review before clicking Fix.** Every suggested change
  is a change to the APP's production schema. Check it against what the app
  reads with the anon key (grandfather status is the sharp edge —
  `user_profiles.is_grandfathered`, and the app queries it on every launch).
- **Whenever an app migration does `CREATE OR REPLACE FUNCTION`**, check
  `20260724185725` for whether the scanner pinned that function, and restate
  the `SET` clause. Otherwise the fix silently reverts and the loop restarts.

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

**The pass work is FINISHED and shipped.** Migrations pushed, functions
deployed, `search_path` repaired, sandbox grant deleted, both OTAs live, and
Neal verified the grant end-to-end on device (5 granted, badge showing, Pass It
On reading 5). Nothing in §§11.3 / 11.5 / 11.7 needs redoing. Head `1360388a`,
pushed; both repos clean.

What actually remains:

1. **Upload the Android AAB to Play** — build `3dbe5e12` (7/26), already
   downloaded to `~/Downloads/sober-dailies-3.0.7-130.aab`. Open-test track
   first. Also clears the API-36 policy warning (deadline 2026-08-31).
2. **Edge-to-edge QA on that build before promoting** — `edgeToEdgeEnabled`
   shifts insets on ALL Android versions: status bar area on Today, the
   floating tab band, the FAB, modals and sheets. The birthday takeover most of
   all, being full-bleed and new in 130.
3. **Bundle the next OTA.** Neal has minor changes accumulating and wants them
   shipped as ONE publish rather than drip-fed to testers — see
   [[commit-ota-only-when-asked]].
4. **Launch flips, when it's time:** `PASSES_ENABLED` → true (+ OTA),
   `EXPO_PUBLIC_ANALYTICS_ENV` → production, strip the Android paywall X and
   the QA force-new-user toggle, bump runtime for the store release (3.0.8
   recommended), and stop `credits-share`/`credits-status` trusting a
   client-supplied `anonymous_id` (§11.3 — at launch it lets anyone spend
   anyone's passes).
5. **Lovable coupling — deferred, nothing to undo.** Standing rule only: a
   Lovable security fix lands in the APP's database, so read it before clicking
   Fix. Grandfather status is the sharp edge (§11.3).

**Still unverified (worth 2 minutes when convenient):** the §11.7 cycle —
give → cancel the composer → balance should stay **5** → give again → the SAME
token comes back → actually send → balance **4**, `sent_at` set on that row
only. The grant half is confirmed; the spend half is not.

---

## 12. Latest session — 2026-07-27 pm (UI laundry list · trial reminder · storage-policy incident · /get page)

**Status: everything app-side is UNCOMMITTED on `3.0.5-redesign` (head still
`b5b63c60`), per the never-commit-unasked rule — Neal wants the accumulating
minor changes bundled into ONE OTA (§11's item 3). The Supabase migration in
12.3 is APPLIED to prod (the file just needs to ride a commit). The web repo
is pushed through `afb54e2` and PUBLISHED.**

### 12.1 Today + reader UI (uncommitted; verified on iOS sim)

- **Milestone band** moved ABOVE the sobriety counter (it answers "what is
  today?"), tucked closer to the header: band margin flipped top→bottom, and
  the Today header's paddingBottom drops 28 → 19 on milestone days only
  (`headerMilestone` in `(tabs)/index.tsx`).
- **Meditation "Done"** now `session.stop()` + `router.back()` (stop first —
  the session is context-backed and would replay a stale completion screen).
  And the completion copy "Marked complete on Today." is finally TRUE:
  `complete()` in `use-meditation-session.ts` marks any program daily with
  `action === 'meditation'` via a `dailiesRef` (DailiesProvider wraps the
  session provider, so the hook composes).
- **Daily Reflections is a real pager** (`components/DailyReflection.tsx`
  rewritten): horizontal paging FlatList, one `ReflectionPage` per day over a
  ±420-day window anchored at mount — grab-and-drag swipe, neighbor page
  slides under the finger (PanResponder + instant content swap deleted).
  Chevrons animate the same slide; calendar/AppState/jumpToDate snap without
  animation; per-visit promise cache prefetches neighbors so they're rendered
  before they arrive. Also fixed Android clipping the masthead title's
  descenders ("Giving Freely") — lineHeight 42 Android-only via
  Platform.select; iOS keeps 36.
- Sim gotcha documented in [[ios-simulator-mlkit-rosetta]]: the Rosetta sim's
  CoreAudio intermittently SIGILLs when a sound plays (meditation bell). It's
  Apple's stack, not app code — don't chase it.

### 12.2 Day-5 trial reminder (uncommitted; NEEDS NEXT BINARY)

The paywall timeline's "Day 5: We'll notify you" promise is now real —
`lib/trialReminder.ts`, wired in `PaywallScreen.buy()` (permission asked
BEFORE `applyCustomerInfo`, while the promising timeline is still on screen)
and a `customerInfo` effect in `useSubscription` that cancels the pending
notification if the trial is cancelled/lapses. Local notification anchored to
the RC entitlement's real `expirationDate` − 48h, fire hour clamped 9–21,
skips if <1min runway (sandbox). Mixpanel: `trial_reminder_scheduled` /
`_permission_denied` / `_cancelled`. ⚠️ `expo-notifications` is a NEW NATIVE
DEP (+ app.json plugin, `defaultChannel: "reminders"`): functional only in the
next binary; deliberately lazy-`require`d so OTAing this JS to old binaries
no-ops instead of crashing — don't "clean up" that require. E2E needs a device
sandbox trial. See [[trial-reminder-day5-notification]].

### 12.3 Prod incident #2: anon storage LIST was gone (FIXED, applied)

iOS and Android showed different reflection heroes; Android's wasn't from the
bucket at all. Root cause: the 2026-07-14 Security-Advisor hardening (§11.3's
neighbor incident) had ALSO dropped anon SELECT on `storage.objects` — object
GET kept working (public bucket) but `list()` returned 0, so FRESH INSTALLS
(Android build 130) fell back to the bundled hero forever while long-installed
iOS coasted on its persisted pool. Fix:
`supabase/migrations/20260727120000_restore_anon_reflection_images_list.sql`
(bucket-scoped anon SELECT) — **applied via `supabase db push` and verified
(22 images via supabase-js); the FILE is uncommitted.** Devices self-heal on
cold start. Write-path closed both sides: web repo's `supabase/config.toml`
(Lovable's route into the APP's prod DB) deleted + pushed (`afb54e2`), and
Neal disconnected the Supabase project in Lovable's Connectors UI. §11's item
5 (the standing Lovable caution) is now largely moot but keep the reflex.

### 12.4 Web /get gift page + Lovable MCP (pushed AND live)

- Gift variant of soberdailies.com/get: headline is just "A friend sent you 3
  free months of Sober Dailies" (subtitle folded in, then trimmed); the
  already-a-member warning moved from fine print to quiet plain text between
  headline and plans ("…Send this link to someone who needs it instead; it
  goes to whoever uses it first"), also above the Android claim button; the
  "Open this link on your phone" card un-carded. Commits `d59ca90`,
  `2a56db9`, `aa62ba2`, `afb54e2`; deployed live and verified.
- **Lovable MCP is connected** (OAuth soberdailies@gmail.com). The publish
  step is now scriptable: `deploy_project` on project
  `d44fafc4-bae4-4e29-bce0-3f06dd9a4d53` (workspace `9E1BLM1AmBtYobs2j6DH`).
  Full web loop: pull → edit → commit → push → deploy. ALWAYS `git pull
  --rebase` the web repo before editing ([[web-repo-pull-before-work]]) —
  Lovable pushes to the same main (a badge-artwork commit landed mid-session).

### 12.5 Next actions

Unchanged from §11 (AAB upload → edge-to-edge QA → bundle the OTA → launch
flips). Note for the OTA bundling: today's 12.1 items are OTA-safe; 12.2's JS
is OTA-safe but inert until the next binary; 12.3's migration file should ride
the same commit.

---

## 13. Session — 2026-07-28…29 (Android launch work · Literature redesign)

**Status: two commits SHIPPED as production OTAs; the third bundle (13.4) was
committed and shipped the next session — see §14.**

### 13.1 Android launch checklist — mostly CLEARED

Canonical list is `docs/LAUNCH-CHECKLIST.md` (committed in `929652e3`); §1–§3
there track live state. What happened this session:

- **AAB build 130 uploaded to Play open testing by Neal** — API-36 policy
  warning cleared.
- **Edge-to-edge QA PASSED** on the API-36 emulator using the exact store
  AAB (universal APK): onboarding, paywall, milestone takeover, Today, tab
  band/FAB, all tabs, dark mode, chat. One find: "1 years" plural bug (fixed,
  shipped).
- **Play license testers were ALREADY set up** (stale memory said otherwise).
  Subscriptions exist on both stores at current prices. Remaining: Neal runs
  one test purchase on a Play-installed device ("Test card, always approves").
- **Android paywall X REMOVED** (shipped): gates back to `__DEV__` only —
  dev/simulator builds keep the X, store builds get the hard wall.
- **v3 pricing decision PARKED** (checklist §2): raise prices without touching
  v2 subscribers — Option A (native store price-increase flows, preserve
  existing) vs B (new SKUs + RC rewire). Grandfather hardening gates it.
- **Google Drive backup ACTIVATED.** Google Cloud OAuth fully configured in
  Chrome with Neal: project **`sober-dailies` under soberdailies@gmail.com**
  (NOT nealw98 — an abandoned duplicate project under nealw98 can be
  deleted); Drive API on; consent screen published to production;
  `drive.appdata` scope classified NON-sensitive (no verification ever);
  two Android OAuth clients (Play app-signing SHA-1 `59:71:0F:…:1F:E1` +
  EAS upload SHA-1 `32:7B:FD:…:0B:BB`). Gotcha: the Play SHA-1 pair was
  already registered as "Android client 3" in the DAILY PATHS project (a
  stranded 7/9 attempt) — deleted there (restorable 30 d), recreated in the
  right project. Code flip `cloudBackupSupported()` → `driveAuthSupported()`
  SHIPPED; **no rebuild needed** (build 130 already contains the native
  modules). Remaining: device E2E after OTA + privacy-wording pass.

### 13.2 Shipped OTA #1 — `929652e3` (update group `fce597ce`)

Launch-prep bundle: Android hard paywall, Drive-backup flip, day-5 trial
reminder JS (inert till next binary), 7/27 UI polish, storage migration file,
feeling-aware Spot Check offline fallbacks (per-persona × resentment/fear/
shame/generic, keyed off the tapped feeling chips — replaces the one canned
line), "1 year" plural fix, Settings gift row → "Pass It On / Give 3 months
of Sober Dailies", `docs/LAUNCH-CHECKLIST.md`.

### 13.3 Shipped OTA #2 — `f372d102` (update group `a5642d88`)

- Meeting Reading reader: shared **aA** text-size button (Prayers pattern).
- Literature "Meeting Readings" header display/22 (was displayBold/26).
- Sponsor chat keyboard now dismissable: tap the conversation to blur +
  `keyboardDismissMode` (iOS interactive drag / Android on-drag).

### 13.4 UNCOMMITTED — the next OTA bundle (all verified on iOS sim)

- **Today:** edit pencil moved INTO the first visible section's header row
  (same line as "Morning"); editing-only "Save" bar; negative-margin hack
  gone. Canned action subtitles **default OFF** (`use-dailies-store.ts`
  default false; stored Debug-Console toggle still wins; user-entered
  subtitles like sponsor name unaffected).
- **Literature home redesign** (per Neal's mock): real cover scans
  (`assets/images/big-book_cover.webp`, `12x12_cover.webp`, both 1290×1700,
  NEW ASSETS — ride the OTA) are the buttons themselves — no cards, no
  shelf (shelf was built, then removed on request); serif titles beneath;
  subtitle "The texts of recovery, always with you."; ALL 6 Meeting Readings
  listed inline, title-only cards (subs removed), no "See all"/second page
  (meeting-readings.tsx still exists for the Meetings-screen path).
- **Both TOCs restyled** (per Neal's 2nd mock): title block = cover + serif
  title + minimal subtitle (meta lines removed on request); serif entries;
  Big Book gets navy numeral column + chapter page RANGES (computed from
  next chapter's start, ending 164); NO progress indicators (explicit);
  entry text rides the shared Aa ladder (`useReadingSize`); **aA button
  added to both TOC headers** (opens ReadingSizeSheet).
- **Built-then-REMOVED:** SM F-56 "Discussion Topics" custom screen (draw-a-
  topic + 42 chips + General Ideas) — Neal didn't like it; fully deleted.
  The old drawn `BigBookCover`/`TwelveCover` components in literature-ui are
  now unused (cleanup-pass fodder, with `PREVIEW_READING_IDS`).

### 13.5 Notes

- Sim automation gotchas: dev-client bundle reloads need terminate+relaunch
  (fast refresh unreliable mid-session); the iOS sim keyboard won't render
  (hardware-keyboard mode sticks) — blur-state is the dismissal proxy.
  A stray automation tap DELETED the sim's 2 test Big Book highlights
  (sim-only data; Neal's devices unaffected).
- Working style (now in memory): per checklist item, state believed status →
  Neal confirms → agree action → act. Console/device state goes stale between
  sessions; verify with EAS/Play/live systems, not notes.

### 13.6 Next actions

1. Neal: Android test purchase on a Play-installed device (last gate for the
   billing path).
2. ~~Bundle + OTA the 13.4 work when Neal says go.~~ DONE — §14.1.
3. After that OTA: Drive-backup E2E on his Android (Settings → Backup &
   Restore → Connect; DEVELOPER_ERROR right after setup = OAuth propagation,
   wait and retry).
4. Privacy/terms wording pass (Drive/iCloud backup) — Neal drafts.
5. Launch flips (checklist §1): PASSES_ENABLED, analytics env, QA toggle,
   runtime bump, `anonymous_id` trust fix.

---

## 14. Latest session — 2026-07-30 (TOC row standard · 3 production OTAs)

**Status: everything from this session is COMMITTED, PUSHED (`3.0.5-redesign`)
and SHIPPED as production OTAs. Working tree clean apart from this handoff.**

A design session driven by three mocks from Neal, each one tightening the same
thing: what a table-of-contents row looks like. It ended with **both books
sharing one row standard**.

### 14.1 OTA #1 — `c413c2c1` (update group `e6232c23`)

Bundled the whole §13.4 backlog (Literature cover shelf, both TOC title blocks,
Today's edit pencil, subtitles-default-OFF) **plus** the first 12 & 12 TOC pass:

- Hero: display title "Twelve & Twelve" / "Steps and Traditions" / "N essays"
  (counted from the data, not hardcoded).
- Cover + title + find tools sit on ONE tinted band that holds its tint through
  the cards and fades into the page at the list boundary
  (`locations={[0.78, 1]}` — a plain 0→1 fade died behind the cards and they
  stopped reading as white).
- `FindCard` gained an optional **`variant="outline"`** (white surface +
  hairline). Default is unchanged, so the Big Book kept its soft fill.
- Front-matter rows dropped their boilerplate description line.

Note: `eas update` bundles the **working tree**, not the commit — so the
§13.4 files were going out either way. Committing them together kept the two
in sync.

### 14.2 OTA #2 — `ed7a1b8b` (update group `e46e2cc4`) — THE ROW STANDARD

Mock 2 inverted the row. Applied to the 12 & 12 and then to Big Book chapters:

- **The content leads.** For the 12 & 12 that's the Step's own words, in FULL —
  the 2-line truncation is gone, so nothing ends in "…" (Tradition Eleven runs
  five lines). For the Big Book it's the chapter title alone on its line.
- **Page metadata follows underneath** as a caption instead of riding above as
  an eyebrow or sitting right-aligned: `STEP ONE · p. 21`, `PAGES 151–164`.
- **The numeral rides the first line**, bold serif — text ink in the 12 & 12,
  navy (`steelDark`) in the Big Book per its mock. NOT the large pale glyph of
  the first pass.
- **Chevron** on the right, `alignSelf: 'center'`, as the tap affordance.
- The chapter/step number is **never repeated in the caption** — the numeral
  has it (the annotated mock's `· CHAPTER ELEVEN` was carrying it twice).

### 14.3 OTA #3 — `ee21ad71` (update group `a23493e1`)

Big Book front matter, Personal Stories and Appendices took the same shape —
title, caption (`PAGE XI`, `PAGE 171`), chevron. Only difference: no numeral,
so their titles start at the margin. `Row` collapsed from two shapes to one and
the right-aligned `rowPage` style was deleted.

### 14.4 Bugs caught in verification

- **Two-digit numerals wrapped** (`1`/`0` stacked) at the first pass's glyph
  size — the column was `size * 1.9` wide for a `size * 1.75` digit. Sized for
  two digits + `numberOfLines={1}`. Steps/Traditions 10–12 and chapters 10–11
  are the cases; re-check any time the numeral scale changes.
- Every row style is a function of `readingSize`, so the Aa ladder moves
  numerals, columns and wrap points together — verify at more than one step.

### 14.5 Deliberately NOT done

- **Dark mode was never opened this session.** Everything is drawn from tokens
  (`c.text`, `c.surface`, `c.background`, `colors.steelDark`) so it should
  follow, but nobody has looked at it. The one thing worth a real check is the
  12 & 12 band gradient, which fades `primarySoft` → `c.background` (= `#000`
  on dark).
- **12 & 12 Intro rows** (Introduction, Foreword) still use the OLD shape —
  right-aligned `p. 14`. Neal's request named the Big Book's sections, so they
  were left alone. Making them match is a small edit if he wants it.
- **Front matter / story captions are single pages, not ranges.** Chapters get
  `PAGES 1–16` computed from the next chapter's start; the others would need
  roman-numeral arithmetic (front matter) and cross-group lookups (stories).
- No `docs/LAUNCH-CHECKLIST.md` items were touched.

### 14.6 Sim-automation notes (confirming §13.5)

- **Fast refresh did not pick up `twelve-and-twelve.tsx` at all this session** —
  two separate edits appeared only after `simctl terminate` + `launch`. Budget
  a relaunch (~60–90 s of bundling) per visual check; screenshotting in a tight
  loop is the wait.
- `idb` is not on PATH; a working venv lives at
  `/private/tmp/claude-501/-Users-nealwagner-Projects-rork-sober-dailies/4ee8fa05-…/scratchpad/idbvenv/bin/idb`
  (the shared `/private/tmp/claude-501/idb-venv` is broken).
- Swipes near the screen edges trigger the back gesture; scroll from x≈300.
  The app restores its last route on relaunch, so a first tap often lands on
  whatever the previous session left on screen.

### 14.7 Next actions

Unchanged from §13.6 (Android test purchase, Drive E2E, privacy wording, launch
flips), plus:

1. Dark-mode pass over both TOCs and the Literature home.
2. Decide on the two open consistency questions in 14.5 (12 & 12 Intro rows;
   page ranges for stories/front matter).

---

## 15. Latest session — 2026-07-30 pm (POST-PURCHASE CRASH — fixed & shipped)

**Status: the fix SHIPPED as production OTA #4 (`c3bb402d`) and was COMMITTED
the following session (`caefd00b`, 2026-07-30 pm #2) — the
revert-on-next-publish risk is gone.** Device-side confirmation is still
OUTSTANDING (see 15.3).

Found while Neal was testing the QA **Force New-User** toggle: subscribe on the
paywall, tap OK on the App Store sheet, app dies. Reinstalling didn't help and
the toggle can only be turned off from inside the app, so the device was
bricked into a paywall loop. Chasing it turned up a bug that had nothing to do
with QA.

### 15.1 The bug — EVERY purchaser on build 130 was crashing

```
Unhandled JS Exception: Error: Cannot find native module 'ExpoPushTokenManager'
…
getNotifications@1:5138763
_scheduleTrialEndingReminder@1:5138995
scheduleTrialEndingReminder@1:5138943   ← PaywallScreen.buy()
```

`PaywallScreen.buy()` calls `scheduleTrialEndingReminder(info)` after **every**
successful purchase. The day-5 reminder (§12.2) added `expo-notifications` in
`929652e3` (2026-07-27); build 130 was cut before that, so its binary has no
`ExpoPushTokenManager` while the OTA bundle it runs does
`require('expo-notifications')`. **Not a QA-only bug** — Force New-User only
made Neal the first person to complete a purchase and find out. Any tester on
130 who subscribed hit it.

Apple's crash reports were useless here: five `.crash` logs, all
`SIGABRT`/`RCTFatal`, none carrying the exception reason. The message only
exists in the live device log (Console.app, process filter `SoberDailies`,
**All Messages** — `RCTFatal` logs at default level via NSLog, so "Errors and
Faults" hides it). Xcode Organizer was a red herring: it only shows crashes
Apple aggregated from analytics-opted-in testers, and the group sitting there
was a *different* crash (a Hermes-init `SIGBUS` at launch on an iPhone 15 /
iOS 26.6 — **still unexplained, still open**, see 15.7).

### 15.2 Root cause — a try/catch around `require()` does not work

This is the transferable lesson. `lib/trialReminder.ts` already *had* the
defensive lazy require, with a comment explaining it kept OTAs off older
binaries from crashing. It cannot work:

```js
// node_modules/metro-runtime/src/polyfills/require.js:178
function guardedLoadModule(moduleId, module) {
  if (!inGuard && global.ErrorUtils) {
    inGuard = true;
    try { returnValue = loadModuleImplementation(moduleId, module); }
    catch (e) { global.ErrorUtils.reportFatalError(e); }   // ← never rethrows
```

Metro catches a module-init throw **itself** and routes it to
`ErrorUtils.reportFatalError` → `RCTFatal` → abort. Control never returns to
your `catch`.

**The rule — it depends on where the require runs:**

| Where the lazy `require()` executes | `inGuard` | Result |
|---|---|---|
| At module top level (during another module's load) | `true` | else-branch, throw propagates → **your try/catch works** |
| From an event handler / async continuation / timer | `false` | guarded branch → **fatal, try/catch unreachable** |

So `lib/cloudSync.ts:19` and `app/_layout.tsx:107` are genuinely safe — they
require at module top level. **Don't "fix" them, and don't copy them into a
callback.**

### 15.3 The fix + OTA #4

`lib/trialReminder.ts`: probe with `requireOptionalNativeModule` (returns
`null` instead of throwing; `expo-modules-core` is in every Expo binary) and
skip the `require` entirely when the native side is absent.

```ts
const REQUIRED_NATIVE_MODULES = [
  'ExpoPushTokenManager', 'ExpoNotificationScheduler', 'ExpoNotificationPermissionsModule',
];
function nativeSideIsPresent(): boolean {
  try { return REQUIRED_NATIVE_MODULES.every((n) => requireOptionalNativeModule(n) != null); }
  catch { return false; }
}
```

All three are cross-platform in SDK 53 — do **not** add the Android-only ones
(`ExpoNotificationChannelManager` etc.) or iOS disables itself.

- Typecheck: 0 errors in `trialReminder.ts` (repo baseline ~116 elsewhere).
- **OTA #4** — channel `production` → branch **`main`**, runtime 3.0.7, update
  group **`6640ef59-e386-4363-afe8-4eaa05ee2358`**, both platforms, from a
  dirty tree (`ee21ad71*`).

  ⚠️ **`--branch` is not `--channel`.** The first attempt published with
  `--branch production` and reached nobody: the **`production` channel points
  at the `main` branch**, and `--branch production` created a *new orphan
  branch* of that name that no channel serves. Update group
  `c3bb402d-1616-40be-aead-17de3ad9c00c` is that dead publish — it exists in
  the project and will never be delivered. Neal caught it when the fix never
  landed on his phone. Publish with **`--channel production --environment
  production`**, as §0 says, and confirm with `eas channel:view production`
  that the newest group under branch `main` is yours. The stray `production`
  branch is still there and should be deleted (`eas branch:delete production`)
  so it can't be picked next time.

**OUTSTANDING:** nobody has confirmed on-device yet. Launch → wait ~30 s for
the download → force-quit → relaunch → purchase should complete. Then turn
Force New-User off (Settings → long-press version → Developer Console).

**Consequence for 130:** the reminder now silently no-ops on that binary. The
paywall timeline still promises "Day 5: we'll notify you," and that promise is
unkept for the whole tester fleet until a new binary ships. `expo-notifications`
is already in `package.json` + `app.json` plugins, so build 131 picks it up.

### 15.4 Same shape, still unguarded: `getSMS()`

`app/(main)/pass-it-on.tsx:36` lazy-requires `expo-sms` with the same
try/catch — and it's called from `giveGift()`, an event handler, i.e. exactly
the fatal case in 15.2's table. `expo-sms` landed 2026-07-18 (`59c771dd`) so
build 130 probably has it (**unverified**), but the guard is written as though
it protects OTAs onto older binaries and it does not. Fix is one line:
`requireOptionalNativeModule('ExpoSMS')`. Currently unreachable because
`PASSES_ENABLED = false`, so it isn't urgent — but it must be fixed **before**
the passes flip, since that's the moment the code path goes live.

### 15.5 The Force New-User toggle is a trap

`QA_FORCE_NEW_USER_KEY` (`hooks/useSubscription.ts:28`) is written to
**SecureStore = iOS Keychain**, which survives app deletion. Delete + reinstall
does **not** clear it, so any crash on the post-purchase path locks the device
into a paywall loop with no way back to the Developer Console. The escape hatch
that works today is **Restore Purchases** on the paywall — `restore()` never
calls `scheduleTrialEndingReminder`, so it dodged the crash entirely and
`applyCustomerInfo` sets `sessionPurchaseUnlock`, dropping the gate.

Two hardening changes were discussed and **NOT done**:

1. Give the key a TTL + auto-clear on a purchase/restore that lands premium.
   The sibling `daily-paths` project already does exactly this
   (`utils/subscriptionOverride.ts`, 30-minute TTL) — port that shape.
2. Related bug, confirmed by reading `hooks/useSubscription.ts:175`:
   **redeeming a code while Force New-User is ON leaves you stuck.** Both
   redemption surfaces (`PaywallScreen.tsx:414`, `redeem.tsx:69`) call
   `refresh()` only; `refresh` sets `customerInfo`, but under the flag
   `isPremium` reads `sessionPurchaseUnlock`, which only `applyCustomerInfo`
   sets. The grant succeeds server-side and the gate stays up. QA-only, but
   it will waste an afternoon if nobody knows.

The launch checklist already carries "remove or `__DEV__`-gate the toggle"
(`docs/LAUNCH-CHECKLIST.md` §1) — that removal makes 1 and 2 moot for users but
not for testers.

### 15.6 OTA hygiene — near-miss worth recording

OTA #4 was published as `eas update --branch production --message …`, i.e.
**without** the `--environment production` that §0 says is mandatory. It was
safe this time and here's the proof, because "it seemed fine" is not good
enough for this failure mode:

- iOS bundle carries `appl_TGcL…` + Supabase URL + the Mixpanel token.
- Android bundle carries `goog_WdCC…` + the Mixpanel token.
  (Each platform bundle holds only its own RC key — Metro folds the
  `Platform.OS` branches per bundle. Not a miss.)
- `eas env:list production` matches the local `.env` exactly, including
  `EXPO_PUBLIC_ANALYTICS_ENV=test` on both sides.

It worked because this machine has a `.env` (dated Jul 3) whose values equal
the EAS ones. On a machine without one, the §0 failure mode is real. **Use the
flag.** A quick way to check any future publish before trusting it:
`strings dist/_expo/static/js/ios/entry-*.hbc | grep -oE "appl_[A-Za-z0-9]+"`.

### 15.7 Purchase + redemption review — STARTED, NOT FINISHED

Neal asked for a full review of the purchase and gift-redemption flows: every
case and edge case, plus how to test each before launch. The reading was done;
**the matrix was not written.** Everything read: `PaywallScreen.tsx` (buy /
restore / `HaveACodeModal`), `useSubscription.ts`, `redeem.tsx`,
`pass-it-on.tsx`, `lib/creditsService.ts`, `lib/giftService.ts`, and the edge
functions `gifts-redeem`, `get-dispense`, `credits-share`, `credits-status`,
`_shared/gifts.ts`, `_shared/credits.ts`.

Findings so far — **carry these into the matrix, don't re-derive them:**

| # | Finding | Confidence |
|---|---|---|
| a | `getSMS()` fatal-require (15.4) | confirmed pattern; binary contents unverified |
| b | Redeem + Force New-User = stuck gate (15.5) | confirmed from code |
| c | After a server-side RC promotional grant, both redeem surfaces call `refresh()` with no `Purchases.invalidateCustomerInfoCache()` — a cached CustomerInfo may leave the user on the paywall after a successful redeem | **suspected, must be tested** |
| d | `computeEarnedGrants` skips `is_sandbox` and `store === 'promotional'` subs (`_shared/credits.ts`) → **passes cannot be earned by a sandbox purchase at all.** Any pass testing must go through the QA passes override (`qa_passes_enabled_v1`) + the `dev_grant_passes` RPC | confirmed from code |
| e | `period_type !== 'normal'` also skips → a user inside a free trial or offer-code period earns nothing until first real charge (deliberate, 2026-07-22) — but it means the thank-you sheet's "we've given you 5 passes" and the wallet can disagree at trial time | confirmed; product question |
| f | `classifyProduct` matches by name (`/year|annual/` then `/month/`) — an annual SKU named e.g. `sub_12month` classifies as **monthly** and grants 1 credit instead of 5. Verify the live RC product ids against this | confirmed from code |
| g | `credits-share` / `credits-status` / `gifts-redeem` all trust a client-supplied `anonymous_id` (and `rc_app_user_id`) — already on the launch checklist as a blocker (§11.3), restated here because it sits squarely in this flow | known |
| h | `fetchCreditStatus()` in `buy()` is a floating promise with no `.catch` — silent in release today (Hermes rejection tracking is `__DEV__`-only), self-heals via grant-on-read | accepted risk |
| i | Identity is `anonymous_id` from SecureStore — new device = new identity = grandfather status and founding credits are lost on device migration | confirmed; needs a product decision |
| j | Offline launch: RC serves cached CustomerInfo so a real subscriber is fine, but the Supabase grandfather check fails closed → a **grandfathered-only** user with no RC entitlement may see the hard paywall offline | **suspected, must be tested** |
| k | Sandbox trials last minutes, so `scheduleTrialEndingReminder` always hits its `fireAt - now < 60s` skip — **the day-5 reminder cannot be tested in sandbox** without temporarily shrinking `WARN_BEFORE_MS` or faking `expirationDate` | confirmed from code |

Also still open from 15.1: the **Hermes-init `SIGBUS` launch crash** on build
130 (iPhone 15, iOS 26.6, ~0.4 s after launch, inside
`JSIExecutor::initializeRuntime()`). Different device, different signature,
nothing to do with purchases. Worth checking whether that device was on an OTA
bundle vs. the embedded one.

### 15.8 Next actions

1. **Commit `lib/trialReminder.ts`.** It is live on the production channel and
   uncommitted — highest-risk item in the tree.
2. Confirm on-device that the purchase completes, then clear Force New-User.
3. Finish the review from 15.7: build the case/edge-case matrix and the
   pre-launch test plan on top of findings (a)–(k).
4. Test (c) and (j) — the two suspected bugs — before the matrix, since both
   change what the plan has to cover.
5. Fix `getSMS()` before the `PASSES_ENABLED` flip (15.4).
6. Port the QA-flag TTL + auto-clear from `daily-paths` (15.5).
7. Next binary (131) restores the day-5 reminder; until then it no-ops and the
   paywall's Day-5 promise is unkept.

---

## 16. Latest session — 2026-07-30 pm #2 (ACCESS TEST PLAN · Android X back · thank-you copy)

**Status: everything committed & pushed this session (crash fix separately as
`caefd00b`, then this session's work). Nothing OTA'd — no user-facing urgency;
the Android X and thank-you changes ride the next bundled OTA.**

### 16.1 The access test plan — `docs/ACCESS-TEST-PLAN.md`

The final pre-launch testing area: every way a user gets INTO the app
(onboarding → paywall → disclaimer → Today). Built from a fresh very-thorough
code map of the gating (not from memory), so every case cites file:line.
Structure: Part 0 test rig (how to manufacture each user type — fresh sandbox
Apple ID, the Supabase SQL to grandfather a device ID, Developer Console
recipes, "looks like a bug but isn't" list) · A first-time users · B v2
upgraders · C returning users · D codes · E trial reminder · F cross-cutting.
Suggested order of attack at the end (A1 iOS money-path first).

Three behaviors encoded as *decide-with-eyes-open* cases, not silent passes:

- **A5**: offline cold launch renders the TRIAL paywall with no packages —
  `trialEligible === null` is treated as eligible (`PaywallScreen.tsx:126`).
- **B2**: grandfathered + airplane mode = paywall (fail-closed by design;
  hardening is parked in LAUNCH-CHECKLIST §4, pre-price-increase).
- **E1**: the day-5 reminder can NEVER fire from a sandbox trial (48 h lead
  vs ~3-min trials; `lib/trialReminder.ts:93` skips <60 s runway). Dev-build
  hack documented: temporarily shrink `WARN_BEFORE_MS`.

Testing protocol per the standing agreement: per-item collaboration — Neal
runs the device steps, reports, pass/fail gets tracked in the doc.

### 16.2 Android paywall X re-added (TEMPORARY — again)

Neal asked for it back for the test pass. Both gates restored to
`__DEV__ || Platform.OS === 'android'` (`app/_layout.tsx` paywallDismissable,
`components/PaywallScreen.tsx` X render). iOS store builds keep the hard
wall. LAUNCH-CHECKLIST §1 item UN-checked with a re-added-2026-07-30 note;
ACCESS-TEST-PLAN Part 0 / A2 / F3 updated to match. **Revert to `__DEV__`
at ship time.**

### 16.3 Thank-you sheet — final copy + QA previews

`components/GiftThankYouSheet.tsx` body copy finalized by Neal (title/serif
line unchanged; rose bold accent kept on the pass count):

- Annual: "**Five passes** to give away. Each one is 3 free months of Sober
  Dailies."
- Monthly: "**One pass** to give away. 3 free months of Sober Dailies.
  Another arrives every 3 months."

New Developer Console buttons (`settings.tsx`, under the paywall previews):
**Thank-you · Annual / Monthly** — render the real sheet without a purchase
(same close-console-first modal-stacking dance as the paywall previews).
Reminder: in production the sheet only ever shows while `PASSES_ENABLED` (or
the device override) is on — `consumePendingAnnouncement()` swallows it
otherwise.

### 16.4 Next actions

1. Start running the plan: **A1 (iOS money path)**, then A2 (Android — also
   closes the LAUNCH-CHECKLIST §2 Play test-purchase item).
2. §15's carry-forwards still stand: on-device purchase confirmation (15.3),
   the 11 review findings (15.7), `getSMS()` before the passes flip (15.4).
3. At ship: revert the Android X (16.2) with the other LAUNCH-CHECKLIST §1
   flips.

---

## 17. Latest session — 2026-07-30 pm #3 (pre-release checklist execution · backup prompt)

**⚠️ STATUS: ALL OF THIS IS UNCOMMITTED** in both repos. Last commit is
`5e10fe74` (§16). Nothing OTA'd, nothing deployed. See 17.6 for the exact
tree. Commit before publishing anything, or the next `eas update` from a
clean checkout ships none of it.

Two halves: Neal ran the first real device tests against the access plan
(17.1), then asked for the pre-release checklist to be executed code-side
(17.2–17.4), then for a backup-discoverability prompt (17.5).

### 17.1 Device testing — two findings, both "working as designed"

**No paywall after reinstall.** Neal signed a sandbox Apple ID into
TestFlight (had to use his real ID — TestFlight always does; the sandbox
account belongs in iOS Settings → App Store → Sandbox Account), reinstalled,
re-onboarded, and sailed past the paywall. Cause: **the iOS Keychain survives
uninstall**, so `anonymous_id` persisted, his id is grandfathered, and the
gate let him through. A clean install is NOT a fresh user on iOS — the test
plan's Part 0 recipe said it was, and has been corrected. Use **Force
new-user** on a grandfathered/personal device (preserves identity) or **Reset
subscription state** on a spare (mints a new id, loses the grandfathered +
dev-grant-allowlisted identity).

**Annual purchase granted 0 passes.** Correct, twice over
(`_shared/credits.ts`): sandbox subs are skipped (`is_sandbox`, added after
the 7/27 incident where a TestFlight yearly earned passes that dispense REAL
offer codes), and no passes are earned during any trial/intro period
(`period_type !== 'normal'`, decided 7/22). Stage giver-side tests with
Console → Grant 5 passes.

⚠️ **This surfaced a real product gap, still undecided** — logged in
LAUNCH-CHECKLIST §3. Every new annual member is on a free week, so they earn
nothing until it converts, yet the thank-you sheet greets them with "Five
passes to give away." Pass It On is empty for their whole first week.
Options: (a) soften the copy to say when they arrive, (b) delay the sheet to
conversion, (c) accept. Only bites once `PASSES_ENABLED` is true.

### 17.2 Checklist items executed (code-side)

- **`getSMS()` guarded** (`app/(main)/pass-it-on.tsx`) — was written as if a
  try/catch protected it; it doesn't (§15.2). Now probes
  `requireOptionalNativeModule('ExpoSMS')`. Was a pre-flip blocker.
- **Trial copy derives from the store** (`components/PaywallScreen.tsx`) —
  `trialDaysFrom()` reads the package's free intro period, `trialCopy()`
  phrases it, Day-N beads follow (warn bead = end − 2, matching
  trialReminder's 48 h lead). **A 7-day offer reproduces the approved wording
  character-for-character**, and an unresolved offering falls back to it, so
  the paywall is visually unchanged today.
- **QA: Developer Console → Preview · Trial reminder** — fires the real day-5
  notification ~8 s out through the same pipeline (`qaPreviewTrialReminder()`
  in `lib/trialReminder.ts`), since a sandbox trial can never schedule the
  real one. Inert on build ≤130; it says so rather than no-opping.
- **Checklists reconciled** — `pre-release-checklist.md` now defers to
  `LAUNCH-CHECKLIST.md` as the single source of truth instead of
  contradicting it; Lane A marked done.

### 17.3 SECURITY: device-ownership proof — ✅ SERVER DEPLOYED & VERIFIED

Addresses the LAUNCH-CHECKLIST §1 blocker (server half closed; the client
OTA is now tracked as its own unchecked §1 item) — `credits-share`/`credits-status`
trusted a client-supplied `anonymous_id`, so anyone who learned an id (it's
the Support ID users paste into feedback emails) could mint a gift link under
it and burn that member's passes.

Trust-on-first-use device secret:
- `supabase/migrations/20260730_device_claims.sql` — new table, RLS on with
  **no policies** (service-role only), stores only a SHA-256.
- `supabase/functions/_shared/deviceAuth.ts` — `verifyDevice()`; handles the
  two-first-calls race via the PK.
- `credits-share` **strict** (`requireSecret: true` — spending needs proof);
  `credits-status` **lenient until claimed** (an unclaimed id still answers,
  so deploy order can't break a legacy client; once claimed only the owner
  reads it).
- Client: `lib/deviceSecret.ts` (32 random bytes in SecureStore) sent via
  `creditsService` `identity()` + `stampSent()`.

**Deployed 2026-07-30** by Neal (migration applied, both functions up) and
verified live with a 7-case smoke test — all passed: unclaimed + no secret
reads fine but can't spend (403 `device_unverified`); a first call carrying a
secret claims the id and falls through to the balance check (403
`no_credits`, i.e. auth passed); wrong secret and missing-secret-on-a-claimed-
id are refused on both functions.

⚠️ **The client half is still uncommitted and un-OTA'd.** `credits-share` now
refuses any caller without a secret, so **gift sharing is inoperative until
that OTA ships**. Harmless right now — `PASSES_ENABLED` is false so
`getShareLink()` returns null before the call, and the QA console is fine
(`dev_grant_passes` is an RPC, the balance read uses lenient
`credits-status`) — but the client OTA and the passes flip must now travel
together.

Housekeeping: the smoke test left one synthetic row —
`delete from device_claims where anonymous_id like 'qa-deviceauth-%';`

Known limitation: if a device keeps `anonymous_id` but loses
`device_secret` (both SecureStore, so normally they travel together), that
device is locked out of spending until the row is cleared manually.

### 17.4 Privacy wording — now WEB-ONLY (in-app copy deleted)

Every privacy link in the app — onboarding, disclaimer, paywall footer,
Settings — opens `https://soberdailies.com/privacy`, which lives in the **web
repo** (`sober-day-reflections`, Lovable). `app/privacy.tsx` was a second,
**orphaned** copy that nothing routed to (like `redeem.tsx`). Per Neal, it
and its `Stack.Screen` registration were **deleted** — the policy now has a
single home, so the two can't drift apart.

The web page gained a **Backup** section (optional, user's own iCloud / Drive
app-data folder, we can't read it, revocable) plus accuracy fixes — the old
text claimed data never leaves the device except for AI chat and aa.org
links, which ignored subscriptions and analytics entirely.

`app/terms.tsx` was orphaned the same way and was **deleted too** (with its
`Stack.Screen`): there is no app-specific Terms document — every Terms link
goes to Apple's standard EULA. So all three legal surfaces are now external
and single-sourced:

| Link | Destination |
|---|---|
| Privacy (onboarding, disclaimer, paywall footer, Settings) | `soberdailies.com/privacy` (web repo) |
| Terms (same four places) | Apple standard EULA (`apple.com/legal/.../stdeula/`) |

No in-app legal screens remain, and `app/_layout.tsx` no longer registers
either route.

**Neal to run:** review the wording (it's legal-ish and Claude drafted it),
then publish the web repo via Lovable. Web repo change is **uncommitted
there**; it typechecks clean.

### 17.5 Backup discoverability prompt (new)

Neal noticed backup lives only in Settings with nothing prompting it.
Investigation found the impact is platform-split:

- **iOS: no gap.** `CloudSyncGate` is mounted at root and iOS needs no
  permission for iCloud, so push-on-background / pull-on-launch has run from
  first launch all along. Reinstall restores automatically.
- **Android: the feature was dark.** Auto sync calls
  `prepareProvider(false)`, which silently no-ops until the user connects a
  Google account once from the Backup screen — and nothing ever asked. (OS
  Auto Backup is on via `allowBackup="true"`, so users weren't unprotected,
  but the Drive path — manual restore, cross-device refresh — was never
  discovered.)

`lib/backupPrompt.ts` — `maybePromptBackup()`, called next to the existing
`logEvent('entry_saved')` in all four Journey save handlers (gratitude,
evening-review, inventory/spot check, journal). Fires **once per install**,
and only when `cloudAvailable()` is false, so it's silent on a healthy
iPhone and speaks on an unconnected Android (and on an iPhone with iCloud
signed out, which is the one genuinely unprotected iOS case). Flag written
before the Alert (so "Not now" still counts), in-memory latch closes the
concurrent-save window, and the key is in `userDataSync`'s
`LOCAL_RESET_KEYS` so "Clear all data & start over" resets it — **that's how
to re-test without reinstalling**. Three new events documented in
`docs/ANALYTICS_EVENTS.md`.

Deliberately NOT put in onboarding: nothing to protect yet, and on Android
the ask is a Google account sheet immediately before the paywall.

### 17.6 The uncommitted tree

App repo (on top of `5e10fe74`):
```
M app/(main)/(tabs)/settings.tsx      QA: thank-you + trial-reminder previews
M app/(main)/evening-review.tsx       backup prompt call
M app/(main)/gratitude.tsx            backup prompt call
M app/(main)/inventory.tsx            backup prompt call
M app/(main)/journal.tsx              backup prompt call
M app/(main)/pass-it-on.tsx           getSMS native guard
D app/privacy.tsx                     DELETED — policy is web-only now
D app/terms.tsx                       DELETED — Terms is Apple's EULA
M app/_layout.tsx                     dropped both legal Stack.Screens
M components/PaywallScreen.tsx        trial copy derived from offering
M docs/ACCESS-TEST-PLAN.md            Keychain/sandbox corrections + E0
M docs/ANALYTICS_EVENTS.md            backup_prompt_* events
M docs/LAUNCH-CHECKLIST.md            reconciled
M docs/pre-release-checklist.md       reconciled → defers to LAUNCH-CHECKLIST
M lib/creditsService.ts               sends device_secret
M lib/trialReminder.ts                qaPreviewTrialReminder()
M lib/userDataSync.ts                 backup_prompt key in LOCAL_RESET_KEYS
M supabase/functions/credits-share    verifyDevice (strict)
M supabase/functions/credits-status   verifyDevice (lenient)
?? lib/backupPrompt.ts
?? lib/deviceSecret.ts
?? supabase/functions/_shared/deviceAuth.ts
?? supabase/migrations/20260730_device_claims.sql
```
(`supabase/.temp/cli-latest` is CLI noise, not ours.)
Web repo: `M src/pages/Privacy.tsx`.

`npx tsc --noEmit` is **byte-identical to the pre-session baseline (137
errors)** — nothing new introduced. Web repo typechecks clean.

### 17.7 Next actions

1. **Commit both repos** (nothing has been committed since `5e10fe74`).
2. Resume the access test plan — **A1 on iOS using Force new-user**, then A2
   on Android (also closes the Play test-purchase checklist item). Per-item
   with Neal, pass/fail tracked in the doc.
3. Confirm on device that a purchase completes without crashing — **§15.3 is
   still open** and every purchase run is a chance to close it.
4. Decide the trial/pass-promise copy (17.1).
5. ~~Deploy the security fix~~ ✅ done 2026-07-30 (17.3). Still to do:
   publish the privacy wording (17.4), and remember the client OTA is now
   REQUIRED for gift sharing to work at all.
6. Ship-time only, deliberately NOT done — they would break current testing:
   `PASSES_ENABLED` → true, analytics → production, remove the Android
   paywall X + QA Force New-User toggle, bump runtime to 3.0.8.
7. Next binary (131) unlocks the day-5 reminder E-cases and the new preview
   button on device.

---

## 18. Latest session — 2026-07-31 (Big Book front matter · grandfather · pricing · launch checklist)

**Everything below is COMMITTED AND PUSHED** (head `45a952d1`), and three
production OTAs shipped. Both repos are clean. This is the first session in a
while that doesn't hand over a dirty tree.

Shape of the day: a UX laundry list, then a tester's bug report that turned
into a content audit, then a walk down `docs/LAUNCH-CHECKLIST.md` item by
item. The checklist is now **9 open items**, five of which are ship-day flips.

### 18.1 Big Book front matter — a tester was right, and it was worse than reported

A tester said the Foreword to Second Edition didn't match the 4th edition.
Diffing the app text against A.A.'s own PDFs (aa.org) found three separate
problems, only one of which was the reported one:

- **Foreword to Second Edition** had *dropped a clause mid-sentence* — "a
  willingness he had never again up to the moment of his death" — an eye-skip
  between two instances of "never…again" that swallowed Dr. Bob getting
  sober. It also rendered `—- *Page xxii* —-`, an editing artifact, as body
  text, and ran xv–**xxii** when the chapter is xv–xxi. Retranscribed from
  the PDF; now word-for-word (the only diff is the drop cap).
- **Foreword to First Edition** had the same class of artifact
  (`**Pages xiii–xiv**` as paragraph 1), "nor dues" for "or dues", and
  missing italics. Neal spotted the last one: *"precisely how we have
  recovered"* is italic in the book. It was in the text but never marked up
  — the renderer has always supported `_…_` (chapters 1 and 2 use it). Data
  gap, not a viewer bug.
- **The Preface was the SECOND edition's preface** — a different document
  entirely, not a variant. Replaced with A.A.'s 4th-edition PDF, rendered
  the same way as the third/fourth-edition forewords (`kind: 'pdf'`,
  `assets/pdf/big-book/en_bigbook_preface.pdf`, keyed in `bigbook-pdfs.ts`),
  and its two pages added to `bigbook-pdf-search.json` so Search still finds
  it. The text `preface.ts` is deleted and unregistered.

⚠️ **The edition policy, so nobody "fixes" this back.** Neal: the first 164
pages ship as 2nd-edition TEXT (essentially identical across editions, and
the copyright position is cleaner); the personal stories ship as 4th-edition
PDFs. So the 4th-edition Preface is *correct* — it describes the story
section the app actually contains. Mid-session I argued the opposite from a
false premise; the record is here so the argument isn't repeated.

Known leftover: the 4th-ed foreword cites the Traditions at "page 561" while
the app maps Appendix I to 565–568 (2nd-ed pagination). A four-page drift
inside a cross-reference; left alone deliberately.

### 18.2 Grandfathered members never meet a paywall

Neal's rule, and a behaviour change: `hooks/useSubscription.ts` used to fail
**closed** — any error, outage or offline launch meant "not grandfathered".
That is exactly how the July RLS incident paywalled real founding members.

Now a verified yes is cached against the device's `anonymous_id`
(`grandfather_verified_v1`) and honoured when the check **fails**. The
fail-open is deliberately narrow: a device that never verified still fails
closed (the cache can preserve access, never create it); a successful "no"
clears it, so un-grandfathering still works once online; **no TTL**, because
an expiry would reinstate the lockout during a long outage. Reset
subscription state mints a new id, which no longer matches, so QA still
falls through to the paywall.

⚠️ Deliberately NOT added to `LOCAL_RESET_KEYS`: wiping data while offline
would otherwise wall a founding member. Docs corrected in three places that
asserted the old behaviour — `revenuecat-grandfather-flow.md` (its "No
Caching" section and truth table), ACCESS-TEST-PLAN **B2** (which was written
to *expect* a paywall; it now expects Today, plus a negative half), and the
checklist.

### 18.3 Pass It On — the trial promise, decided

Passes are earned on the first real charge, never during a trial, so a new
annual member had none for a week while the thank-you sheet said "Five
passes to give away." Decided (a) + arrival announcement:

- Thank-you copy promises **arrival**, not possession, and never names a
  trial length (that comes from the store).
- A second `arrival` mode of the same sheet fires when the grant total
  rises — purely functional, no billing language, per Neal.
- Detection reuses the existing plumbing: a high-water mark of
  `total_granted` in `creditsService`. Guards: no baseline = record
  silently (a returning member isn't greeted with passes they've had for
  months); a pending purchase announcement suppresses it (convert-with-no-
  trial gets one sheet, not two); swallowed while `PASSES_ENABLED` is false.
- Worth knowing: **grant-on-read** means no webhook is needed — every
  `credits-status` call recomputes from RevenueCat state and inserts what's
  missing, so passes appear on the first status call after conversion.

⚠️ **Never seen on a device.** Developer Console → **Arrival · 5 passes**.

### 18.4 Pricing — $3.99 / $19.99, and it's a DECREASE

Final prices. Because it's a decrease, none of the price-increase consent
machinery applies. Neal configured both stores in place (no new SKUs, so the
existing offer-code batches stay attached): grandfathered stay free, v2 keeps
v2 pricing, new v3 subscribers get the new price.

**Nothing changed in the app** — there is no price literal in the codebase.
The paywall reads `product.priceString` and derives the rest, so it will show
$1.67/mo for yearly and hold at SAVE 58%. Remaining: confirm the numbers
actually render during A1 (store changes take hours to propagate; RC caches
offerings).

### 18.5 Web (`sober-day-reflections`) — both pages published

- `/get` quoted $4.99/$24.99 → now $19.99/$3.99, "about $1.67 a month"
  (`bdd3fbc`).
- **Privacy policy published** (`f2d9680` + `3aa61ae`). New Backup section,
  and the accuracy fix that mattered: the live page claimed data never left
  the device except for AI chat and aa.org links, which ignored subscriptions
  and analytics entirely. Effective date moved to 2026-07-31 — Neal caught
  that it still read July 20, **2025**, which would have dated the policy
  before the terms it describes.

⚠️ **Lovable deploy gotcha, learned the hard way:** after pushing to that
repo, confirm the project's `latest_commit_sha` matches BEFORE deploying. A
deploy fired seconds after the push rebuilt the *pre-push* state and reported
success. Publish → wait for sync → deploy → verify by grepping the live JS
bundle.

### 18.6 Remote housekeeping + an analytics audit

**Deleted (Neal ran them):** `gifts-purchase` and `gifts-wallet`, ACTIVE in
production since 2026-07-13 despite their source being deleted 07-20
(`5b4954a4`) — unreferenced, unmaintained, publicly reachable, and
`gifts-purchase` still trusted a client-supplied `anonymous_id`.
**Kept deliberately:** `gifts-redeem` and `get-dispense`.
**Also orphaned, found by diffing deployed functions against client refs:**
`check-grandfather` (0 refs — the app queries `user_profiles` directly) and
`invites-report` (0 refs).

**Analytics migration is complete on the client.** One pipeline:
`lib/analytics.ts` → Mixpanel HTTP API (no native SDK, so it rides OTAs). No
`usage_events`/`analytics_events` writes remain; no expo-insights, Firebase,
Amplitude or Segment installed. The only Supabase write left is
`app_feedback`, which is a feature.

⚠️ **Two analytics traps, both recorded in the checklist §1 item:**
1. `EXPO_PUBLIC_ANALYTICS_ENV` must be flipped in **BOTH** the EAS
   environments and the **local `.env`** — no eas.json profile declares an
   `environment`, so `eas update` resolves it from the local file. Verified
   2026-07-31: all three say `test`, so nothing is polluted.
2. `EXPO_PUBLIC_*` is inlined at update time and testers share channel
   `production` — so once flipped, ANY OTA re-tags the tester fleet as
   production unless the store binary is on its own runtime. Fallback:
   `distinct_id` is the anonymous/Support ID, so a Mixpanel cohort of tester
   IDs can be excluded regardless of tagging.
3. The EAS `development` environment is EMPTY — no Mixpanel token AND no
   RevenueCat keys, so subscriptions can't initialise in a dev-profile build.

### 18.7 Fresh-install bug: "Get started" rendered as "Get"

Found by Neal on device, first run only. The onboarding gate in
`app/_layout.tsx` sat **above** the `fontsLoaded` check, so on a fresh
install the welcome screen could render while Inter/Archivo were still
loading — the label measured against fallback metrics and kept that width
when the real face arrived. A 3-second splash failsafe is what let it reach
the screen at all. Onboarding now waits for `fontsLoaded` behind the same
brand-teal fill. JS-only, so it's OTA-able, and it affects every fresh
install of build 130 in the wild.

### 18.8 UX laundry list (earlier in the session)

Meditation top-bar buttons solid white (navy and periwinkle were tried and
rejected — white matches Begin and the selected chips); Literature books get
`paddingTop` so a small scroll doesn't shear them; Morning/Evening prayer
dailies open the **full prayer library** instead of deep-linking one prayer;
Today's edit **Save** moved onto the "Morning" line where the pencil was (new
`DailiesEditor` `headerAccessory` prop); **Set Aside Prayer** added between
Serenity and Sick Man (no source line — it's not from the literature); 12 &
12 contents page adopts the Big Book's gradient + soft-filled find cards;
paywall Monthly label/price move together and match Yearly's weight;
onboarding headline → "The daily habits that build long-term sobriety" (sized
to hold two lines); What's-inside sponsor card drops the sample chat bubble.

### 18.9 Shipped today

| What | Where |
|---|---|
| OTA 1 | `c9490af8` — device_secret client, backup prompt, trial copy, legal screens |
| OTA 2 | `28508a0c` — Big Book front matter, grandfather cache, pass sheets, 12&12 |
| Web | `/get` pricing + privacy policy, live and verified on soberdailies.com |
| Commits | `3b87fa22` … `45a952d1` on `3.0.5-redesign`, all pushed |

### 18.10 Next actions

1. **Neal is creating production build 131** (day-5 reminder + Invite
   Friends need the binary; the landscape PDF fix already shipped in 130).
   Decision taken: keep **runtime 3.0.7** so 131 joins 130 in one fleet and
   stays OTA-able through testing; bump to 3.0.8 only for the launch binary
   (132), which also cleanly separates tester analytics from production.
2. **Run the access test plan** — A1/A2 have still never been run. It is the
   real launch gate, and now also needs to confirm the new pricing renders
   and that **B2** behaves (grandfathered + airplane mode = Today, and the
   negative half: never-verified device still gets the paywall).
3. Remaining device tests: pass send E2E, the ~2-minute spend-half cycle,
   and eyes on the **arrival sheet**.
4. Retire the 3 ASC gift consumables + Play IAPs; optionally delete
   `check-grandfather` and `invites-report`.
5. Ship day, as one pass: `PASSES_ENABLED` → true, analytics → production
   (**both places**), remove the Android paywall X + QA Force New-User
   toggle, bump runtime to 3.0.8.

---

## 19. Latest session — 2026-07-31 (build 131 · literature find row · save confirmation)

**Everything is COMMITTED AND PUSHED** (head `aa6dafba`). Continues §18 from
the same day; read that first for the Big Book / grandfather / pricing work.

⚠️ **The last OTA (`c5c55038`) was published at `dffbf985`.** The six commits
after it — the entire save-confirmation and nightly-review change — are
**committed but NOT OTA'd**. Publish before assuming a tester has them.

### 19.1 Build 131 — built, both platforms

`app.json` bumped to buildNumber/versionCode **131**, runtime deliberately
left at **3.0.7** so 131 joins 130 in one OTA fleet and stays fixable through
the access-plan testing. **3.0.8 is reserved for the launch binary (132)**,
which also separates store analytics from the tester fleet (see 19.5).

- iOS built with `--auto-submit` → uploads to App Store Connect on its own.
- Android AAB **downloaded to `~/Downloads/sober-dailies-3.0.7-131.aab`**
  (103 MB). Play upload stays manual — `eas.json`'s submit profile still
  points at the `./path/to/api-key.json` placeholder.
- What 131 unlocks that 130 can't: the **day-5 trial reminder**
  (`expo-notifications`, access-plan cases E0–E2) and **Invite Friends**
  actually sending (`expo-sms`). ⚠️ Correction to §18: the **landscape PDF fix
  already shipped in 130** — it is NOT a reason to build.

Credential prompts answered during the build, recorded so they aren't
re-litigated: the **APNs push key is team-wide**, so the same key legitimately
serves `daily-paths` and `hands-off` — reusing it is correct, and Apple caps
you at two active keys per team anyway. (Contrast with the real 7/9 mistake,
where Sober Dailies' Play SHA-1 was filed in the **Daily Paths Google Cloud
project** — OAuth clients ARE per-project, and that one had to be moved.)

### 19.2 Literature contents pages — one find row

Both book TOCs replaced four chunky utility chips with a single 44pt row:
a **live search field** plus circular **Bookmarks** (solid glyph + count) and
**Highlights** (Big Book only, + count). Shared `FindRow` in
`components/literature/literature-ui.tsx`, so the books differ only by family
colour (steel / teal). Surfaces are `c.surface` — the SAME token the search
result cards use, so controls and output read as one material (0.72 then 0.8
translucent white were tried and rejected).

**All three tools render ON the page**, nothing slides up from the bottom:
- Typing filters in place — results replace the contents list, clearing
  restores it. A numeric query still offers "Go to page N" first, which is
  what made the separate Go-to-page chip unnecessary (both books already had
  that branch in their `searchResults` — no search logic changed).
- The circles are **toggles**: their list replaces the contents, tapping an
  active circle closes it, and typing closes whichever list is open.
- `BigBookHighlightsList` gained an **`inline`** mode — same rows, no Modal,
  no sheet chrome, no inner ScrollView (the page already scrolls).

Verified on device: 12&12 "humility" → 20 inline results; Big Book "62" →
Go to page 62; highlights toggle + empty state.

⚠️ **Dead code left deliberately** (a pure swap, easy to revert): the old
search / go-to-page / bookmarks / highlights **Modals are still in both files
but unreachable**, and `FindCard` is still exported with no callers. ~150
lines across three files whenever cleanup is wanted.

### 19.3 "Saved to your Journey" — the save confirmation

The problem: people write an entry, tap Save, land back on Today, and have no
idea it still exists. **It bites upgraders hardest — v2 put a History button
on the tool page itself**, so anyone coming from v2 goes looking for something
that no longer exists.

Iterated four times; the FINAL shape, so nobody re-opens settled ground:
- An **Alert**, not a toast. A snackbar was built first and rejected on
  device — "the small black toast isn't seen, it just flashes."
- **Title only**: "Saved to your Journey". The explanatory sentence was cut —
  the title says both that it saved and where it went.
- Buttons **View** (opens Journey) and **OK** (returns to Today, as Save
  always did). Both are post-save, so there is **no Cancel** — the entry is
  already written and nothing can undo it.
- The **buttons do the navigating**, so the Alert is never presented
  mid-transition (an iOS failure mode) and needs no timing hack.
- Lives in `lib/savedNotice.ts` → `confirmSaved()`. All four Journey tools
  call it and return.

**The backup nudge is sequenced, not traded.** `maybePromptBackup()` moved
out of the four tools and into `confirmSaved()`, and fires on the **OK path
only** — the one that lands on Today. It self-guards and waits 700 ms for the
destination to settle, so it queues behind the save dialog instead of
stacking. View doesn't fire it: that path exists to go read the entry, which
is the wrong moment for a backup pitch. Trade-off accepted: someone who always
taps View never sees it. (`maybePromptBackup` now returns a boolean; no
caller consumes it any more.)

### 19.4 Nightly review keeps tonight's answers

It now behaves like the gratitude list: tonight's saved answers **prefill the
form**, so a second visit adds to the review instead of starting blank and
overwriting it. Save writes the whole visible set back; the prefill is keyed
to TODAY, so tomorrow opens clean on its own. Save lights up only when the
answers differ from what's stored — same rule as gratitude.

### 19.5 Analytics + env, verified

`EXPO_PUBLIC_ANALYTICS_ENV=test` in **all three** places that matter: the EAS
`production` environment, the EAS `preview` environment, and the **local
`.env`**. The build log confirmed EAS loaded it. Nothing is polluted.

Three findings worth keeping (all recorded in LAUNCH-CHECKLIST §1):
1. Flipping to production needs **BOTH** the EAS environments and the local
   `.env` — no eas.json profile declares an `environment`, so `eas update`
   resolves it from the local file.
2. `EXPO_PUBLIC_*` is inlined at update time and testers share channel
   `production`, so after the flip ANY OTA re-tags the tester fleet — unless
   the store binary is on its own runtime (3.0.8). Fallback: `distinct_id` is
   the anonymous/Support ID, so a Mixpanel cohort of tester IDs can be
   excluded regardless of tagging.
3. The EAS **`development` environment is EMPTY** — no Mixpanel token AND no
   RevenueCat keys, so subscriptions can't initialise in a dev-profile build.

Client migration is complete: one pipeline (`lib/analytics.ts` → Mixpanel
HTTP API). No `usage_events`/`analytics_events` writes, no expo-insights /
Firebase / Amplitude / Segment. Only Supabase write left is `app_feedback`,
which is a feature.

### 19.6 The Android paywall X — not a bug

The X was missing on the emulator's Android build. Cause: that APK is
**build 130, built 7/26** — the X was removed 7/27 and re-added 7/30, so
130's embedded bundle has the `__DEV__`-only gate. iOS showed it because that
was the dev client on Metro with current code. **131 has it** (Neal
confirmed). Both gates are unchanged since `9cf43415`:
`__DEV__ || Platform.OS === 'android'` in `app/_layout.tsx:286` and
`components/PaywallScreen.tsx:275`. Nothing to fix; the X still exits with
the §1 ship-day flips.

Also seen on that emulator and NOT a bug: *"The device or user is not allowed
to make the purchase"* with a disabled CTA — Play Billing refusing on an
emulator with no licensing. Exactly the case the Android X exists to escape.

### 19.7 Not verified — the top of the next session's list

Simulator work fought back all session (dev client dropping to its launcher,
Fast Refresh resetting to the paywall). These are **committed and typechecked
but never seen running**:

1. ~~**The save dialog** on all four tools, and the backup nudge queueing after
   it on the OK path.~~ **VERIFIED 2026-08-01 on Neal's simulator.**
2. ~~**The nightly-review prefill** — save an answer, reopen, expect it there.~~
   **VERIFIED 2026-08-01 on Neal's simulator.**
3. **The arrival sheet** (§18.3) — Developer Console → Arrival · 5 passes.
4. **B2** — grandfathered + airplane mode should land on Today; a device that
   has NEVER verified should still get the paywall. New behaviour, already
   live in production since the 07-31 OTA.

⚠️ Also unconfirmed: whether the **backup prompt** appears on a real iPhone
signed into iCloud. It SHOULD be silent — `cloudAvailable()` is
`CloudStorage.isCloudAvailable()`, false only when iCloud is signed out or
Drive is off, which is why simulators always see it. If it fires on a
signed-in phone, that IS a bug.

### 19.8 Next actions

1. **Publish an OTA** — six commits of save-confirmation work are unshipped.
2. Upload `~/Downloads/sober-dailies-3.0.7-131.aab` to the Play open-testing
   track; iOS should arrive in TestFlight on its own.
3. Work 19.7 on device, then the **access test plan A1/A2** — still never
   run, still the real launch gate. It also needs to confirm the new
   $3.99/$19.99 pricing renders.
4. Remaining checklist items: pass send E2E + spend-half cycle; retire the 3
   ASC gift consumables + Play IAPs; optionally delete the orphaned
   `check-grandfather` and `invites-report` edge functions.
5. Ship day, as one pass: `PASSES_ENABLED` → true, analytics → production
   (**both places**), remove the Android paywall X + QA Force New-User
   toggle, bump runtime to 3.0.8, build 132.

## 20. Latest session — 2026-08-01 (launch-checklist audit · testing campaign · B2 verified)

Working mode this session: one consolidated open-items list, worked one by one
(Neal driving devices, Claude driving everything else). **Uncommitted at
session end: `lib/trialReminder.ts` (copy tweak) and `docs/LAUNCH-CHECKLIST.md`
(audit edits).** Both ride the next commit + OTA.

### 20.1 Audit — the checklist is TRUE

Every open LAUNCH-CHECKLIST item was re-verified against code and live
infrastructure; nothing had drifted. Confirmed still pending exactly as
documented: `PASSES_ENABLED=false` (creditsService.ts:27), analytics `test` in
all three places (re-checked live via `eas env:list` + `.env`), Android X gates
`__DEV__ || android` (_layout.tsx:286, PaywallScreen.tsx:275), QA
Force-New-User ungated, runtime 3.0.7/131 with 3.0.8 reserved.

Audit findings beyond the docs:
- **The gift-24h worry is DEAD**: `GIFT_ENTITLEMENT_DURATION` is NOT among the
  deployed Supabase secrets, so `gifts-redeem` grants the code default
  `three_month` (marked LAUNCH VALUE). Nothing to revert.
- **The "redeem bypass" no longer exists** — the dev mock died with the
  purchased-codes retirement (07-20); redemption is fully server-validated.
  Checklist clause rewritten (that's part of the uncommitted checklist edit).
- Developer Console full inventory documented in the checklist §1 item:
  Grant-5-passes is server-gated by `dev_pass_granters` (safe); the
  passes-on-this-device override is client-side but harmless (balance is
  server-side). Simplest ship-day answer: `__DEV__`-gate the whole PAYWALL &
  SUBSCRIPTION + GIFT PASSES sections.
- `check-grandfather` + `invites-report` confirmed still ACTIVE on Supabase
  (0 client refs). Deletion deliberately parked until testing is over.
- ⚠️ RLS note: anon SELECT on `user_profiles` is column-scoped to
  `is_grandfathered` ONLY — selecting `created_at` returns 42501. The July fix
  working as designed; don't "fix" it.

### 20.2 Shipped

- **Production OTA `066a0562`** (runtime 3.0.7, both platforms) — the six
  save-confirmation/nightly-review commits plus the §19.7 doc update
  (`47641b92`). Fleet is current with head as of this session's start.
- **131 AAB uploaded to Play** open testing (Neal) — sat in Google review at
  session end. iOS 131 arrived via auto-submit.

### 20.3 Verified today (the testing campaign)

1. **Save dialog + nightly-review prefill** — Neal's simulator (§19.7 #1–2),
   then re-confirmed from the published OTA bundle on iPhone AND Android sims.
2. **Arrival sheet** — Dev Console previews (5-pass and 1-pass) look right.
3. **Backup prompt silence** — real iPhone signed into iCloud: save → dialog →
   Today, NO backup nudge. `cloudAvailable()` behaves.
4. **Spend-half cycle** (§11.7) — full pass on iPhone: cancel keeps 5, re-give
   returns the SAME token, real send → 4. ⚠️ That send produced a LIVE pass
   link on Neal's phone — use it as the input for the pass E2E (#8); nothing
   is consumed until the recipient opens it.
5. **B2 grandfather-offline** — VERIFIED on real device, with a lesson:
   the first airplane-mode pass "worked" but proved nothing (Neal's ID wasn't
   in `user_profiles`; RevenueCat's cached sandbox sub was doing the lifting).
   After inserting his ID with a pre-cutoff `created_at`: online launch →
   Today (cache written), airplane mode + cold start → Today. The 07-31
   fail-open cache works. Both test rows deleted afterward; Neal's phone
   un-grandfathers itself on its next online launch (the "successful no clears
   the cache" path). The never-verified half (fresh ID + offline → paywall)
   was NOT run — low risk, the cache is keyed to anonymous_id — fold into a
   later sim session.
6. **Day-5 trial reminder preview** — fired on Neal's iPhone from build 131:
   permission prompt, 8s banner, real copy. Binary plumbing confirmed. Copy
   then tweaked (uncommitted): app name added, month shortened, tail trimmed —
   `Your Sober Dailies trial ends Monday, Aug 3. Keep going — or cancel before
   then and you won't be charged.` Banner truncation is fine per Neal: the
   first sentence alone fulfils the Day-5 promise. Real-timing E2E still open.

Grandfather conceptual note (came up during B2): grandfather = `user_profiles`
row keyed to the keychain-persisted anonymous_id; RevenueCat does NOT carry it
(RC carries purchases via Apple ID; promo grants key to the same anonymous_id).
Two separate doors: user_profiles for founders, RC for payers.

### 20.4 Infrastructure set up today

- **Neal's iPhone allowlisted in `dev_pass_granters`** (`4dfaa418-…64cd`) and
  granted 5 passes (4 remain + 1 live sent link). ⚠️ Reset Subscription State
  on that phone would orphan the allowlist row — don't.
- Sim dev-client crash during the Wi-Fi-off attempts = React Native inspector
  assertion (`HostTarget::registerInstance`) when reloading with Metro
  unreachable. Dev tooling only; production builds can't hit it. Also learned:
  don't run offline sim tests that require Claude mid-loop — use a
  self-contained script, or a real device.

### 20.5 Still open (the short list)

1. **Pass send E2E** — recipient opens the live link → /get → plan → Apple
   sheet → clean install → no paywall flash. Needs a second device.
2. **Access test plan A1/A2** — still the real launch gate. ⚠️ Must confirm
   $3.99/$19.99: the sim paywall STILL showed $4.99/$24.99 today (RC offering
   cache / store propagation) — if it persists on device, investigate before
   ship.
3. Retire the 3 ASC gift consumables + Play equivalents (store consoles).
4. Delete `check-grandfather` + `invites-report` (post-testing tidiness).
5. Trial-reminder real-timing E2E (needs a multi-day sandbox trial).
6. Ship day, one pass: PASSES_ENABLED → true · analytics → production (BOTH
   EAS envs AND local .env) · Android X → `__DEV__` · QA toggle gone (decide
   scope of Dev Console gating) · runtime 3.0.8 · build 132.

## 21. Latest session — 2026-08-02 (RC SHIPPED · Android gift E2E · two live-fire fixes · prices set)

Same working session as §20, second act. **Everything committed and pushed
(head `a5874545`); tree clean.** The app has crossed from "testing 3.0.7"
to "fine-tuning the 3.0.8 release candidate."

### 21.1 The launch flips are DONE — build 132 RC exists

All §1 checklist flips executed in one pass (`78889bd4`):
`PASSES_ENABLED=true` · Android X gone (hard wall both platforms) ·
analytics `production` in all three places (local `.env` + EAS
`production` + `preview`, via `eas env:update --variable-name … 
--variable-environment …`) · app.json → version/runtime **3.0.8**,
build/versionCode **132**.

- **Android 132 RC APK: BUILT and on Neal's phone.**
- **iOS 132: NOT built** — ad-hoc provisioning profile expired; needs
  Neal interactive: `eas build --profile preview --platform ios`.
- RC = `preview` profile = **channel `dev`** + internal distribution +
  Android APK. Fine-tuning OTAs: `eas update --channel dev` (two shipped
  already, see 21.3). Double-isolated from testers (channel AND runtime).
- Store launch builds will be **133** (`production` profile). The 3.0.7
  tester channel is FROZEN (`.env` now says production — flip back to
  `test` before any emergency 3.0.7 OTA).
- DECIDED: **Developer Console stays in production builds** (long-press
  version). Rationale in checklist §1. On the RC, turn Developer Mode ON
  to keep Neal's sessions out of production analytics.

### 21.2 Android gift E2E — VERIFIED on the shipping build (3 rounds)

Full recipient path proven on the 132 RC: pass sent from Neal's iPhone →
soberdailies.com/get → SD code dispensed → Have a code → redeem → wall
drops → Today. Also seen working: already-redeemed error (readable), hard
wall (no X), pass consumption per round. **REMAINING: the iOS recipient
leg** (Apple offer-code sheet → clean install → no paywall flash) — needs
a second iPhone, no sandbox exists.

Identity mechanics learned (worth remembering for QA):
- **"Clear all data & start over" deliberately KEEPS identity**
  (`lib/userDataSync.ts` — anonymous_id + RC entitlements survive; it's a
  DATA clean-install, mirrors a real reinstall). That's why round 1's
  "fresh" device skipped the paywall: same RC identity, gift still active.
- **"Reset Subscription State" is the true identity wipe** (deletes
  SecureStore anonymous_id, clears onboarding flags, `Purchases.logOut()`).
  Safe on any device NOT allowlisted in `dev_pass_granters` (Neal's
  iPhone `4dfaa418-…` IS — never reset that one).
- The disclaimer key survives both tools — only a genuinely clean install
  shows the disclaimer again.

### 21.3 Two live-fire bugs, found by Neal, fixed + OTA'd to channel `dev`

1. **Have-a-code sheet hidden by the Android keyboard** (`50408cc5`):
   RN's KeyboardAvoidingView doesn't track the keyboard inside a Modal
   and did nothing on Android. Now keyboard-controller's
   KeyboardProvider + KAV `behavior="padding"` (PrayerEditSheet pattern).
   Also: a backdrop tap with the keyboard up now dismisses the KEYBOARD
   first, second tap closes — "get the keyboard out of the way" can no
   longer silently abandon a typed code.
2. **Redeem success didn't drop the wall until app restart** (`a5874545`):
   gift entitlements are granted SERVER-side (RC REST), so the SDK's
   cached CustomerInfo predated the grant and `refresh()` re-read stale
   cache. Fix: `Purchases.invalidateCustomerInfoCache()` before refresh
   in the paywall's `onRedeemed`. Verified on device: wall now drops
   immediately.

Both verified by Neal on the RC after a Check-for-update. ⚠️ The 132
EMBEDDED bundle predates both fixes — a fresh RC install must pull the
`dev`-channel OTA (launch once, relaunch) before judging these flows.
⚠️ 3.0.7 Android testers still have the keyboard bug (their channel is
frozen); workaround is the keyboard's Go key — ship-relevant only if more
tester redemptions are expected before launch.

### 21.4 Pricing — the real story + both stores now set

CORRECTION to §18/checklist: the LIVE store price was **v2's
$1.99/$9.99** (not $4.99/$24.99 — that number was never live). So
$3.99/$19.99 is an INCREASE for new users. v2 subscribers are safe by
default: Play auto-creates a **legacy price cohort** on a base-plan price
change (existing subscribers renew at their old price unless the
developer explicitly migrates them — never do that), ASC equivalent for
the scheduled change.

- ASC: change scheduled, takes effect 2026-08-02 sometime.
- Play: Neal updated the base-plan prices 2026-08-02.
- VERIFY after propagation (hours): cold-start the RC on each platform →
  paywall reads **$3.99 / $19.99 / SAVE 58% / $1.67-per-mo**. No code
  involved — everything derives from `product.priceString`.

### 21.5 Also this session

- **Pass badge shows the real count** (`PassItOnGift.tsx`, cap now 99+;
  was capped at "9+" which hid Neal's 11).
- **Version label reads the BINARY build** (`Application.nativeBuildVersion`)
  instead of the app.json snapshot OTAs carry — Settings can no longer
  claim a build the device doesn't have (root cause of §19.6-style
  confusion). expo-application ships in every binary since January.
- Trial-reminder copy shipped in the earlier §20 OTA (`a9ea25b4` to the
  3.0.7 channel — published BEFORE the analytics flip, so tagging is fine).
- BUY-passes idea KILLED (Neal): passes are acquisition, not revenue —
  recorded in checklist §4 + invite-rewards-design.md. Don't resurrect.

### 21.6 Next session — where to pick up

1. iOS 132 build (Neal, interactive), then iOS-side RC checks.
2. Price re-eyeball both platforms after store propagation.
3. iOS recipient leg of the pass E2E (second iPhone).
4. Access test A1 formal pass (fresh-user trial purchase on the RC).
5. Tidiness: ASC gift consumables + Play equivalents off sale; delete
   `check-grandfather` + `invites-report`; B2 never-verified half on sim.
6. When Neal is satisfied with the RC: build 133 (`production` profile),
   store submissions, LAUNCH.

## 22. Latest session — 2026-08-02→04 (feedback ops · pass funnel · Spot Check redesign · OFF RORK)

Head `92cac766` at handoff; tree clean. Everything below is committed,
pushed, and (where app-side) OTA'd to channel `dev` runtime 3.0.8.

### 22.1 LLM infrastructure — the big move: OFF Rork, onto our Anthropic key

- DISCOVERY: `toolkit.rork.com` is a FREE ANONYMOUS endpoint — no key is
  ever sent, so Neal's paid Rork subscription was NEVER used by the app
  (credits meter Rork's builder, not runtime). Measured 4–16s + failures
  at real prompt sizes starting ~Aug 2. Neal may cancel Rork.
- BOTH chat surfaces now run PAID-FIRST through the `sponsor-chat`
  Supabase fn → Anthropic `claude-sonnet-4-6`, temp 1.0 (pinned in code;
  legacy engine/temperature settings deliberately ignored — stale stored
  values). Free Rork = automatic fallback (25s/20s timeouts). Haiku was
  tried and NEUTERED Sam — Sonnet holds character.
- Server personas were condensed knock-offs → now BYTE-SYNCED to the
  client's canonical prompts (python splice script; re-sync on any
  persona edit + `supabase functions deploy sponsor-chat`). Sam's
  guardrails loosened (verdicts allowed, no-assume rule removed,
  commitment-to-character clause added); crisis/identity/vulnerability
  protections KEPT. ⚠️ Server-side persona edits apply instantly to all
  devices, no OTA — the launch-week tuning lever.
- COST: ~1.5¢/reply; 25/day cap (lib/sponsorChatLimits, shared with spot
  check) bounds worst case ≈$11/user/mo. Paid-path history window is 10
  turns (Rork era was 20 — deliberate? revisit). Admin page now has a
  "Sponsor LLM Spend" panel reading `sponsor_chat_usage` (per-call token
  logs the fn always wrote). ⚠️ NEAL PENDING: $50 monthly spend limit +
  alert in the Anthropic console; verify ANTHROPIC_API_KEY bills to an
  account HE owns (Resend lesson).

### 22.2 Spot Check redesign — SHIPPED (spec: docs/spotcheck-redesign-spec.md)

Wizard split in two: single FORM (feelings chips, "What's happening right
now", live Watch For/Strive For via new FEELING_PAIR map, 3 save states,
split CTA w/ full roster) + separate EPHEMERAL chat session
(`spot-check-chat.tsx` — never touches the main thread, opens with the
sponsor's page-3 question, page 4 = ONE message summary+3 actions, then
"Add {name}'s take?" DIALOG only if saved, Done discards). Prefetch on
form-ready pause + tap; 20s timeouts. Dead code left for cleanup pass:
askHandoffOpener, SPOT_CHECK_HANDOFF_KEY, injectSpotCheckHandoff
(spotCheckCard RENDERING kept for old histories). Journey doesn't yet
label an added take as "{name}'s take".

### 22.3 Feedback ops + admin page (web repo `sober-day-reflections`)

- soberdailies.com/admin REBUILT + PUBLISHED (the old admin died with the
  marketing redesign — same Lovable project d44fafc4, GitHub-synced;
  deploys now verified by `latest_commit_sha` + MCP deploy_project).
  Has: feedback triage (status open/closed + delete + admin notes —
  Neal/Lovable iterated), Grandfather lookup/grant tool, LLM Spend panel.
- Feedback now captures rc_app_user_id + accessibility blob (pixel ratio,
  color scheme, OS a11y toggles — Daily Paths lesson); in the email + DB
  + admin dialog. anonymous_id = grandfather key; rc_app_user_id =
  entitlement-grant key (RC has NO custom app user id).

### 22.4 Pass program

- Duration DECIDED: keep 3 months (docs/pass-duration-business-spec.md —
  cannibalization supply-capped ~$250/yr worst; tripwire: gift-cliff
  conversion <15% after 50+ redemptions → A/B a 1-month batch).
- Mixpanel funnel: server events pass_granted/sent/dispensed/redeemed
  live (token baked into _shared/mixpanel.ts — CLI can't set secrets);
  board "Pass It On — Funnel" id 11420090. ⚠️ NEAL PENDING: RC→Mixpanel
  integration (iOS redemption + cliff-conversion stages).
- iOS recipient leg E2E: worked via hand-minted gift_shares token
  (Android device granter row added to dev_pass_granters). ⚠️ Neal
  created a REAL production subscription on his Apple ID — CANCEL IT
  (Settings→Apple ID→Subscriptions) before the 3 free months bill.
  Clean-install no-paywall-flash variant still unproven (his phone was
  never going to show the wall). Dev-Mode pass sending = OS share sheet
  (SIM-less Android fix).

### 22.5 Smaller ships

Manage Subscription row (RC Customer Center, managementURL-gated) +
ungated Dev Console "Present Customer Center" QA row (CC configured in
RC by Neal); canned daily-action subtitles REMOVED for good; glyph/tone
audit (speaker=mic, exercise=dumbbell, service=heartHandshake,
ACTION_TONE self-heals quick actions, warm aliases→terracotta,
normalize-on-save kills onboarding day-one drift); new 12&12 cover
(transparent, AI-garbled tagline retypeset via PIL/Futura — script in
scratchpad); tab bar SETTLED: white pill + teal items + firm hairline +
crisp shadow (deep teal + pale tint tried, rejected); Save→View goes
straight to Journey (router.replace); pencil/Save 1.5pt optical fix.

### 22.6 Next session

1. Neal: Anthropic $50 cap + key ownership; RC→Mixpanel integration;
   cancel the test subscription; run `db push` if admin notes need a
   column (check — Lovable may have added it).
2. Verify Sonnet Sam on device (spot check + main chat) — tune server
   personas live if needed (deploy-only).
3. Launch checklist remainder: iOS 132 build (interactive), price
   eyeball, A1 fresh-trial purchase, tidiness items, then build 133.

## 23. Latest session — 2026-08-04 (spot check form v2 · LLM cost caching · Rork QA toggle)

Head `33b29d18`, tree clean (supabase/.temp noise only). Everything
committed, pushed, and OTA'd to channel `dev` runtime 3.0.8 (last update
group `736a6d2c`). Server fn deployed twice; migrations applied by Neal.

### 23.1 LLM cost — prompt caching + exact spend accounting

- The 1¢/turn scare was the persona prompts (1.2–1.7k tokens) re-billed at
  full price every turn. `sponsor-chat` fn now sets TWO cache_control
  breakpoints: persona system prompt (shared across all users of a
  sponsor; reads at 0.1×) + last history message (turn-to-turn prefix).
  Verified live: turn 2 read 1,949 tokens from cache. Warm turns ≈ 0.2¢;
  worst-case capped user ~$2–3/mo (was ~$11). Cold first turn still pays
  ~1.25× write. Client sends a SLIDING 10-turn window, so history caching
  breaks past 10 turns (system tier survives; ~0.1¢ exposure — left alone).
- Usage rows now log input_tokens (full price) + cache_read_tokens (0.1×) +
  cache_creation_tokens (1.25×) separately — migration `20260804090000`;
  `20260804091000` TRUNCATED sponsor_chat_usage (Neal wanted a clean
  baseline). Admin panel (web repo `7c8114b`) prices each tier exactly and
  shows "% cached". ⚠️ Panel is pushed to main but NEEDS A LOVABLE PUBLISH
  (MCP unauthenticated this session; preview already shows new code).
- ⚠️ Migration history was tangled: CLI upgraded 2.72→2.111 (auth re-done
  by Neal via keychain approval); local `20260802_...` filename sorts after
  `20260802120000_...` — Neal ran `supabase migration repair --status
  reverted 20260802` + `db push --include-all` himself (classifier blocks
  those for Claude).
- Rows logged between migration and fn re-deploy (~10 test calls) read
  slightly high forever — known 7¢ of noise.

### 23.2 Spot check form v2 (spec updated: docs/spotcheck-redesign-spec.md)

- **Causes question turns inward** ("my part", commit `720405df`): the
  chat's opening question challenges responsibility — resentment→side of
  street, fear→losing/not-getting/future-tripping/self-reliance-vs-faith,
  shame→own-and-make-right. Extremely vague input gets called out ("can't
  inventory what you won't name — the dodge is their part").
- **Chips**: −Lonely (still typeable; mappings kept), +Jealous +Guilty
  +Overwhelmed +Hurt (13 fixed), wired into FEELING_PAIR, fallback
  flavors, and the my-part prompt clusters. **Other… pill restored** from
  the wizard (dashed pill → free-text, rides as a normal chip).
- **Reflection card replaces Watch For/Strive For** (which couldn't see
  the situation). Explicit trigger: Enter/Cancel row under the input (+
  keyboard Done); clearance 24→84. Contract: understanding-first summary →
  ONE best-fit asset from the Daily Moral Inventory card (SPOT_PAIRS
  strive-column = the classic card Neal photographed) → AI-sponsor invite
  tailored to the situation. One paragraph + blank line + closer —
  `normalizeReflection()` enforces shape. Regular type (italics rejected).
  **Sonnet** after a Haiku trial — Haiku followed format but Sonnet picks
  the asset ("self-forgiveness, for the part of you still measuring your
  worth against someone else's applause"); asset choice IS the product.
  Server persona `reflection` (neutral app voice) added to the fn;
  client-side copy exists for the Rork fallback. ~0.2¢/reflection.
- **Save = THIS PAGE ONLY**: SpotCheckEntry.reflection new field; fresh
  reflection after save re-arms the pill. "Add {name}'s take" RETIRED —
  chat writes nothing back ever. Journey renders "Reflection" section
  (new) + legacy "What {name} heard" (old records).
- **Nav**: CTA = "Save & talk with {name}" — saves silently, router.REPLACE
  into the chat (page one clears; sheet pick passes sponsor override into
  save()). Chat header lost the back chevron: Done is the only button;
  system back/swipe land on Today/Tools like Done. No path back to form.

### 23.3 QA Rork toggle (A/B before launch)

Dev Console → This Device → "Use Rork LLM (free)": per-call flag
(`sober_dailies_qa_llm_rork`, lib/sponsorApiSettings) — BOTH chat surfaces
+ all spot check calls (incl. reflection) skip paid Anthropic for the free
Rork endpoint. No restart; replies labeled `rork (QA)`. Fresh key on
purpose — legacy engine settings stay ignored. Rork calls don't appear in
the Spend panel (they bypass the fn).

### 23.4 Next session

1. **Neal**: Lovable publish (admin panel per-tier pricing is preview-only);
   still pending from §22: Anthropic $50 cap + key ownership,
   RC→Mixpanel, cancel the test Apple subscription.
2. Device pass on the new form flow (Enter/Cancel clearance value 84 is an
   estimate) + Rork A/B via the toggle.
3. Cleanup-pass debris grew: askHandoffOpener + SPOT_CHECK_HANDOFF_KEY +
   injectSpotCheckHandoff (already listed) + now spot_check_take_added
   analytics event gone, SpotCheckSeed.savedEntryId informational-only,
   `pairsForFeelings` unused by the form (kept for the map itself).

### 23.5 Addendum — reflection response playbook (post-handoff, same day)

Neal nailed down per-cluster responses for the form's reflection card; the
FULL contract + playbook moved SERVER-SIDE into the fn's `reflection`
persona (it outgrew the 2000-char message cap, and server-side = deploy-only
tuning). Client (`4dcf534f`, OTA'd group `303b2ada`) now sends only
feelings + situation; byte-synced fallback copy in spotCheckLLM.ts for the
Rork path. Playbook: fear/anxiety/overwhelm → future-tripping, stay in
today, honest facts, FAITH by name (Step 2), rely on Higher Power instead
of white-knuckling; discontent/irritable/restless → gratitude + get out of
self; angry/resentful → forgiveness, often acceptance; ashamed →
self-forgiveness; else best-fit inventory asset. Standing rule: spiritual
angle never softened — "faith" and "Higher Power" said plainly. Verified
live on all clusters (best output: the relapsed-son scenario — "where your
control ends and faith begins"). ⚠️ Old-OTA clients send the old embedded
contract alongside the new server prompt until they update — harmless but
muddled; the 303b2ada OTA aligns them.

## 24. Latest session — 2026-08-04/05 (routing final · 133 SHIPPING · Sam's voice root-caused)

Second act of the same working day as §23. Head at handoff includes
`3acb1461` (routing), `87919fc9` (133 bump), `f1310170` (voice+timeouts).
**Neal is smoke-testing PRODUCTION build 133 via TestFlight right now and
said "I think I can ship this."**

### 24.1 LLM routing FINAL: Sonnet → GPT-5.4 → Rork

- Sonnet primary everywhere (cached ~0.2¢/turn, temp 1.0). **GPT-5.4 is
  the paid BACKUP** through the same fn (same server personas; verified
  live — Sam holds character on GPT, playbook followed; OPENAI_API_KEY
  was already configured, `gpt-5.4` allowlisted). Rork = last-ditch
  lifeboat only (different infra than the Supabase fn the paid providers
  share). QA toggle = Rork-only, no fallback. Spend panel prices gpt-5.4
  rows (web `86afda7`); **Lovable publish DONE (Neal)**.
- **Rork degradation is THEIR backend**: benchmarked 40% stall / 3.8s
  median on successes (bimodal fast-or-never = their queueing, NOT our
  context/payloads — folded vs multi-message identical). Baseline +
  recheck script: `scripts/rork-health.mjs` (**UNCOMMITTED**) +
  memory `rork-health-baseline`. Watch @rork_app on X for fixes.
- Rork chat timeouts now role-aware: 25s when QA toggle makes it the only
  engine (was 10s — made turn-2+ visibly time out), 10s as backup.

### 24.2 Sam's Sonnet tameness ROOT-CAUSED (the week-long mystery)

Full prompt archaeology: NOTHING colorful was ever deleted from the
canonical prompt (whole history = Jul 14 greeting trim, Jul 23 question
rule, Jul 26 softeners [questions-not-verdicts era], Aug 3 softeners
REMOVED, Aug 4 commitment clause). The three tameness sources, all fixed:
(1) Jul 26–Aug 3 softener rules; (2) condensed server Sam + Haiku on paid
turns (fixed Aug 3/4); (3) **THE SONNET-SPECIFIC ONE: the fn's
TUNING_APPENDIX said "do not reuse the same catchphrases / avoid stock
replies" — Sonnet obeys literally and rationed exactly the phrases that
ARE Sam; Rork never sees the appendix.** Rewritten as VOICE OVER POLISH
(signature phrases = the voice, use liberally, vary WHICH one; spoken
rhythm over polished prose; reflection persona EXEMPTED). Deployed +
verified: single-shot bite back, 3-turn pushback test held ("That's not
support — that's me helping you drink"). Server-side = live everywhere,
tunable by deploy.

### 24.3 Launch state (checklist updated in repo)

- **133 = the ship build** (iOS RC skipped): production profile, channel
  `production`, runtime 3.0.8. TestFlight/Play-test first, promote the
  SAME build. **3.0.7 fleet is NEVER OTA'd again** — testers upgrade via
  store tracks; runtime isolation makes it automatic.
- **`production` channel is now the live fine-tuning channel**: OTA group
  `c10b31fa` (voice/timeout commit) already published there for Neal's
  TestFlight 133. Future client fixes: `eas update --channel production`.
- DONE this session: prices LIVE at $3.99/$19.99 (Neal), Lovable publish
  (Neal), RC→Mixpanel DIAGNOSED + deferred post-launch (per-RC-project;
  existing integration = Daily Paths→"Daily Growth" project 3993969
  [product `monthly_support`], leave alone; SD RC project has NO
  integration — set up fresh with SD Mixpanel project 4040342 token; no
  backfill). Anthropic cap guidance given (platform.claude.com/settings/
  limits → $50 + Billing auto-reload) — Neal's completion UNCONFIRMED;
  same advised for OPENAI_API_KEY (now carries backup traffic).
- Remaining before/at promote: cancel Neal's real Apple sub from 08-02
  E2E; spend caps confirm; pull 3 ASC gift consumables + Play equivalents;
  Developer Mode ON on his devices.

### 24.4 OPEN ITEM — Neal's last pre-ship nit (AWAITING HIS GO)

The spot check chat OPENER (prefetched causes question) reads "pretty
much the same" as the form's reflection card — both are LLM calls fed
identical inputs (feelings+situation), and since the playbook landed
their territories overlap (fear→future-tripping/faith in BOTH). Proposed
fix (designed, NOT implemented): add `reflection` to SpotCheckSeed; the
causes-question task gets "the app already reflected back: «…» — do NOT
repeat it; your question goes where it pointed: their part." Client-side
→ needs commit + production-channel OTA. Implement on Neal's word.
