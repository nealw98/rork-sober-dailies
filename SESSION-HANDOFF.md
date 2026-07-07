# Session Handoff — Sober Dailies

_For a fresh chat. Branch `3.0.5-redesign` (tracks `origin/3.0.5-redesign`). Latest commit: `b9286d61`._
_**OTA status (iOS production, runtime 3.0.6):** `5a271c23` + `57f8449b` are OTA'd/live. `b9286d61` (splash + review-prompt) and the Today add-list color fix are committed + pushed but **NOT yet OTA'd**._

---

## 0. App & workflow

- **App:** "Sober Dailies" — AA/recovery app. Expo SDK 53, RN 0.79, old arch, bun, EAS, expo-router. Local-first (AsyncStorage/SQLite). Supabase only for read-only content + AI-sponsor edge fn (analytics is Mixpanel, §5). RevenueCat monetization (see §4). Light **and dark** mode (OLED dark shipped earlier).
- **OTA:** production build listens on EAS channel **`production`**, runtime **`3.0.6`** (fixed string). Publish JS-only iOS changes with:
  `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 eas update --channel production --platform ios --message "…" --non-interactive`
- **Android now exists** (this session, §2). Native rebuild for Android via EAS: use the **`preview`** profile for a sideload APK (`eas build --platform android --profile preview`). `androidPreview` profile is broken (points at a missing local `credentials.json`). Android has **no production-channel client yet**, so Android changes ride the next native build, not OTA.
- **Hard rule:** NEVER commit / push / OTA / deploy on your own — only when the user explicitly asks. (Push and OTA are separate asks.)
- **Typecheck baseline:** `npx tsc --noEmit` ≈ **160 pre-existing errors**. Keep it **at/under 160**; higher = you introduced an error.
- UI-behavior work (blur, WebView, keyboard, font scaling) can't be checked by tsc — flag it for device testing.
- **Supabase project ref:** `uzfqabcjxjqufpipdcla`. (Supabase MCP is READ-BLOCKED — CLI works; MCP `execute_sql`/`list_tables` return permission errors.)

---

## 1. What shipped this session (committed + OTA'd to iOS production)

**Reading-text system reworked → OS Dynamic Type + shared in-reader "Aa"** (commits `5a271c23`, `57f8449b`)
- The old custom text-size control (Settings steppers + per-reader sheets, `hooks/use-text-settings.ts`) was **deleted** — it sized chrome too and felt disjointed.
- Reading text now = a **shared "Aa" scale** (`hooks/use-reading-size.ts`, `ReadingSizeProvider` in `_layout`). Ladder **15/17/19/21/23**, default **17** (Apple Body), **layered on OS Dynamic Type** (RN `allowFontScaling`, nothing overrides it). Shared sheet: `components/ReadingSizeSheet.tsx`.
- "Aa" surfaced in **Daily Reflection, Big Book reader, and the Prayers read view** (all write one shared value). Secondary surfaces (meeting-reading, sponsor-chat ×0.92, MarkdownReader, BigBook highlights/search) follow the shared size, no button. **Chrome stays fixed** (list previews 14, daily titles 16, etc.) — Aa never touches it. No global Settings control. See memory `text-size-system-dynamic-type`.
- **Big Book WebView fix** (`57f8449b`): the WebView ignored Dynamic Type (CSS `-webkit-text-size-adjust:none`), so it looked smaller than the native readers at a large system size. Now multiplies HTML px by `PixelRatio.getFontScale()` + pins Android `textZoom={100}`.

## 2. Android support (committed in `5a271c23`; ships via next native Android build)

- **Reader serif:** Georgia is iOS-only → bundled **Gelasio** (metric-compatible clone) for Android. `readerSerif`/`readerSerifItalic` in `constants/fonts.ts`. (Big Book WebView falls back to Noto Serif on Android — accepted; sizes match, serifs are near-identical.)
- **Tab-bar glass:** real blur is OFF on Android. `experimentalBlurMethod="dimezisBlurView"` was tried and **REVERTED** — it rendered to a window texture that **blanked out pushed screens** (the sponsor chat came up white). Android now uses `intensity={0}` + a near-opaque frosted `barTint`. **Do NOT re-enable dimezis** without testing every pushed screen.
- **Backup & Restore** is iCloud-only → Android gets an empty-state card; the Settings "Your Data" entry is hidden on Android.
- `Courier`→`monospace` in MarkdownReader; `versionCode` 122.
- **Gotcha:** `expo prebuild` wipes `android/local.properties` (SDK path). If a Gradle build says "SDK location not found," recreate it with `sdk.dir=$HOME/Library/Android/sdk`, or the user can add `ANDROID_HOME` to `~/.zshrc` (they were going to do this manually — the harness blocks editing shell profiles). See memory `android-build-3.0.6`.

## 2b. Launch/splash + Today add-list color (committed `b9286d61` + follow-up; NOT OTA'd)

- **White-flash-on-reopen fix** (`app/_layout.tsx`): the splash was hidden when fonts + onboarding + OTA-check were done, but the render gate ALSO waits on `isSubscriptionLoading` (RevenueCat + grandfather network calls) → returned `null` (white) in the gap. Fix: (1) splash-hide now also waits for `!isSubscriptionLoading`; (2) the `null` return is now a brand-teal `<View>` fill so no gate ever flashes white. **JS → OTA-able.**
- **Native splash background navy → teal `#3D8B8B`** (`app.json`, all 3 spots). ⚠️ **NOT OTA-able** — splash config is baked into the native binary; only shows after the next `eas build`. (Also eyeball the splash logo `splash-icon.png` on teal — if it was tuned for navy it may want a new asset.)
- **Today "Add to" list colors** (`components/today/DailiesEditSheets.tsx`): the catalog used legacy color aliases (`amber→teal`, `lavender/blue/coral→periwinkle` via `resolveTone`) so items didn't match their Today-list tint (meeting showed purple vs blue, Morning Prayer teal vs terracotta). Fixed to canonical families (steel/teal/periwinkle/terracotta) per `DEFAULT_PROGRAM` + `toolFamily`. Added items now also carry the right color onto the list. Verified on device. **JS → OTA-able.**

## 3. Review-prompt rework (committed `b9286d61`, pushed; NOT OTA'd)

**OTA-safe** (`expo-store-review` is already in the native builds) — send it whenever. See memory `review-prompt-system`.
- **Gate:** `MIN_DAILY_COMPLETION_DAYS = 5` distinct days with any daily marked done + 30-day cooldown (`lib/reviewPrompt.ts`). Replaced the old "7 app-open days" gate + per-feature sub-thresholds. **5 is a tunable constant** (user considered 7; decided 5, can bump later).
- **Recorder:** `recordDailyCompletionDay()` wired into `hooks/use-dailies-store.ts` completion paths.
- **Triggers** (positive moments; each re-checks the gate): all dailies done (`index.tsx`), meditation completed (`use-meditation-session.ts`), speaker finished ≥2min/≥50% (`useGlobalAudioPlayer.ts`), Big Book close (`BigBookMain.tsx`), Daily Reflection viewed (`DailyReflection.tsx`).
- Verified gate logic on emulator via `[reviewPrompt]` logs (native card can't show in dev builds — `hasAction:false`).

---

## 4. Monetization — reviewed this session (no code changes; decisions made)

- **Stack:** RevenueCat (`react-native-purchases` v9.7.2). Logic in `hooks/useSubscription.ts` (entitlement `premium`); paywall `components/PaywallScreen.tsx` (hard paywall — "whole app subscription-only after onboarding"; sells Yearly + Monthly w/ 7-day trial, prices live from RC).
- **`PAYWALL_ENABLED = false`** in `app/_layout.tsx` — but **RevenueCat shows 43 active subscriptions** (growing), so the paywall is almost certainly **live in the actual production build** and the disabled flag is preview/uncommitted-only. ⚠️ **Verify which state prod is in before flipping anything** (don't turn the paywall OFF for paying users). Open offer: check git history of `PAYWALL_ENABLED`.
- **`user_profiles.rc_app_user_id` is unreliable** (populated for only 2 of 43 subscribers). RevenueCat is the source of truth for subscribers, NOT that table. (The app reads entitlement from RC `customerInfo` at runtime, so it's fine functionally.)
- **Data (from CSV exports):** 607 users, **415 grandfathered** (pre-Feb-4-2026, free-forever) but only ~43 active; 43 active paying subs; ~99 users active in the last 5 weeks.
- **DECISIONS:** (1) **Keep grandfathered users free** — no code change (current `is_grandfathered` logic stays). (2) **Existing subscribers → new price with the new app**, opt in/out — this is a **store-console action** (App Store Connect / Play), not code; a >50% increase requires each existing sub to consent or lapse; new subs pay the new price automatically.
- **Still open:** set the new price in the stores; decide when to launch/flip `PAYWALL_ENABLED`; Android Play service-account key (`eas.json` `submit.production.android.serviceAccountKeyPath` is a placeholder) + Play IAP setup.

---

## 5. Analytics: Mixpanel

- **Client:** `lib/analytics.ts` (raw HTTP ingestion, OTA-safe). Developer Mode fully mutes it.
- **`EXPO_PUBLIC_ANALYTICS_ENV=test`** in `.env` right now — **FLIP TO `production` when a release candidate ships.**
- Event taxonomy + full reference: `docs/ANALYTICS_EVENTS.md`.
- **Sponsor rate-limit `created_at` column** on `sponsor_chat_usage` still UNVERIFIED (fail-open if wrong) — quick Supabase CLI check.

---

## 6. Open items / next steps

- **Ship the review-prompt rework** (§3) when ready — commit + push + OTA.
- **Monetization:** verify prod paywall state; set new price; Android Play submit setup (§4).
- **Device-test on a real iOS device:** the new "Aa" in all 3 readers, Big Book size now matching Daily Reflection (the fix the user reported).
- **Mixpanel:** flip `ANALYTICS_ENV` to `production` for the RC.
- **Sponsor backend decision — STILL OPEN:** Rork (default) vs Supabase edge fn. Recommendation: retire Rork, use the edge fn.
- **Security P0s:** server-side sponsor rate limiting, RLS on `app_feedback`/`user_profiles`.
- **App Store submission** — last known build `3.0.6 (122)`; verify.
- Accessibility-size chrome hardening (caps + restack at AX sizes) — user said "maybe later."

---

## 7. Key files cheat-sheet

| Concern | File |
|---|---|
| Reading size store (shared Aa) | `hooks/use-reading-size.ts`, `components/ReadingSizeSheet.tsx` |
| Reader serif (Georgia/Gelasio) + reading constants | `constants/fonts.ts` |
| Review prompt (gate + triggers) | `lib/reviewPrompt.ts` |
| Subscription / entitlement | `hooks/useSubscription.ts`, `components/PaywallScreen.tsx`, `_layout.tsx` (`PAYWALL_ENABLED`) |
| Dailies store (completion, per-day total) | `hooks/use-dailies-store.ts` |
| Today ledger + all-dailies-done trigger | `app/(main)/(tabs)/index.tsx` |
| Daily Reflection reader | `components/DailyReflection.tsx` |
| Big Book reader (WebView + font scale) | `components/bigbook-v2/BigBookHtmlReader.tsx`, `BigBookMain.tsx` |
| Prayers (read view + Aa) | `app/(main)/prayers.tsx` |
| Tab bar (glass, Android fallback) | `components/navigation/FloatingTabBar.tsx` |
| Meditation / speaker (review triggers) | `hooks/use-meditation-session.ts`, `hooks/useGlobalAudioPlayer.ts` |
| Analytics (Mixpanel) | `lib/analytics.ts`, `docs/ANALYTICS_EVENTS.md` |
| Design tokens (teal `#3D8B8B`, ramps, theme) | `constants/designTokens.ts` |
| Build config | `eas.json`, `app.json` |

---

## 8. Recent commit trail (newest first)

- `b9286d61` Teal splash + no white flash on reopen; review-prompt rework _(pushed, NOT OTA'd)_ — plus a follow-up commit for the Today add-list color fix + this handoff
- `57f8449b` Big Book reader: scale WebView text with OS Dynamic Type _(OTA'd, iOS prod, group f5c480f7)_
- `5a271c23` Android support + reading text via Dynamic Type with shared in-reader Aa _(OTA'd, iOS prod, group 9a0c98d9)_
- `a5fb6883` Laundry list: UX polish, typography unification, analytics refinement
- `a2a663d6` Dark mode: OLED theme, lit-card treatment, app-wide theming + Tools card cleanup
- `036449ef` Update session handoff
- `1497b8af` Backup & Restore: iCloud-only; move Start Fresh to Settings › Developer

_All session work is committed + pushed as of `b9286d61` + the follow-up. Nothing OTA'd past `57f8449b`._

---

## 9. Untracked files in the tree

- `SESSION-HANDOFF.md` — this doc.
