# Session Handoff — Sober Dailies

_For a fresh chat. Branch `3.0.5-redesign` (tracks `origin/3.0.5-redesign`), in sync. Latest commit: `1497b8af`. Tree clean except this file._
_OTA status: `dbafc575` and `b3a653bf` are live on the `production` channel (iOS). **`1497b8af` (backup/Start-Fresh changes) is committed + pushed but NOT yet OTA'd.**_

---

## 0. App & workflow

- **App:** "Sober Dailies" — AA/recovery app. Expo SDK 53, RN 0.79, old arch, bun, EAS, expo-router. Local-first (AsyncStorage/SQLite). Supabase only for read-only content + the AI-sponsor edge function (analytics is Mixpanel, see §2). RevenueCat (paywall disabled via flag). Light mode only (dark deferred).
- **OTA:** production TestFlight build listens on EAS channel **`production`**, runtime **`3.0.6`** (fixed string). Publish JS-only changes (iOS) with:
  `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 eas update --channel production --platform ios --message "…" --non-interactive`
- **Hard rule:** NEVER commit / push / OTA / deploy on your own — only when the user explicitly asks. (Push and OTA are each separate asks — don't assume one implies the other.)
- **Typecheck baseline:** `npx tsc --noEmit` ≈ **160 pre-existing errors**. Keep it **at/under 160**; higher = you introduced an error. Remaining are legacy `Colors.light possibly undefined` + `headerBackTitleVisible` + one `content-2nd-edition-backup.ts` missing-module.
- User iterates visually + fast via OTA. Don't compromise design to stay OTA-able; native rebuilds are fine. UI-behavior work (blur, measure, keyboard, WebView) can't be checked by tsc — flag it for device testing.
- **Supabase project ref:** `uzfqabcjxjqufpipdcla`. Sponsor edge fn redeploy: `supabase functions deploy sponsor-chat --project-ref uzfqabcjxjqufpipdcla`. (Supabase MCP is READ-BLOCKED on this project — the CLI works, but MCP `execute_sql`/`list_tables` return permission errors.)

---

## 1. What shipped most recently (UI polish + analytics session)

All committed; the first two batches are OTA'd, the backup batch is not (see header).

**UI**
- **Daily Reflection** (`components/DailyReflection.tsx`): Share + Text-size are now **header icons** (styled like the literature reader); the 3-dot overflow menu is gone.
- **Today edit UX** (`app/(main)/(tabs)/index.tsx`): removed the per-daily gear/Settings sheet. **Long-pressing a daily's label in Edit mode expands it in place** into an editable card (title + subtitle) over a blurred page — a reanimated morph (`EditOverlay`: measures the row rect, blurs the screen, grows the card, nudges up only if the keyboard would cover it). Drag-to-reorder moved onto the **grip-handle medallion**. New `subtitle?` field on `DailyItem` + `editDaily` store method (`hooks/use-dailies-store.ts`).
- **Meditation** (`app/(main)/meditation.tsx`): "Done" on the completion screen now just **clears back to the setup screen** (no nav away); **"Sit a little longer" removed** (+ `sitLonger` dropped from `hooks/use-meditation-session.ts`).
- **Journey** (`app/(main)/(tabs)/journey.tsx`): entries are **shareable** — a share icon in each entry sheet emits gratitude/journal/nightly/spotcheck as plain text.
- **Tab bar** (`components/navigation/FloatingTabBar.tsx`): **frosted glass** — a `BlurView` samples the real screen (bar bg is transparent so the blur isn't muddied) under a thin tint on top. The **Sponsor FAB now sits inline** to the right of the pill on one line. The pushed-screen FAB (`components/navigation/GlobalSponsorFab.tsx`) is **locked to the same position** so it doesn't jump between tab/pushed screens.
- **Tools** (`app/(main)/(tabs)/tools.tsx`): removed the redundant Settings gear (Settings is on the tab bar).
- **Trends heatmap**: weeks are now **Sunday-first (US)** (header + grid offset).

**Analytics**
- **Developer Mode now fully suppresses analytics** — no events, no People-profile writes — when `developer_mode_enabled` is on (e.g. the simulator). Gate lives in `lib/analytics.ts` (`setAnalyticsDeveloperMode`, read on init + wired live from the Settings toggle). Previously it only *tagged* activity as developer.
- **Speaker events** now send `speaker_name` + `title` alongside the talk id (`speaker_played`, `speaker_listened`), threaded via a `meta` arg on `load()` (`useGlobalAudioPlayer.ts` ← `SpeakerPlayer` ← `speaker-detail`). `speaker` (id) kept as the stable key.

**Trends completion rate (data-shape change)**
- "Average Dailies per day" → **"Average completion rate"**: the average of each active day's completion **percentage** (done ÷ that day's possible total), 0-days omitted, **unweighted** (each active day = one equal vote).
- Each completion record now **stamps its possible total** (`program.length + 1`) at write time — `DayCompletion.total` in `hooks/use-dailies-store.ts` (`updateToday` + `setDayCompletion`). So the Trends rate **and** Journey's "X of Y" reflect **that day's setup**, not today's program size. Forward-only: pre-existing days have no `total` and fall back to the current size (clamped ≤100%).

**Backup & Restore** (`app/(main)/backup.tsx`)
- Now **iCloud-only** — the clipboard copy/restore fallback was retired. **Start Fresh** (run onboarding / clear all data) removed from here; it already lives in **Settings › Developer**. ⚠️ On non-iOS (`!iCloudSupported()`) the screen is now **empty** — iOS-first assumption; add an empty-state/fallback if Android ships.

### Earlier this cycle (context, already OTA'd before this session)
Meditation audio redesign (persistent ambience bed + global session), the **Trends** page (streaks/heatmap/insights), **custom prayers**, **Big Book highlights list**, the **classic reader removal + 41-file dead-code purge**, and the **analytics migration to Mixpanel**.

---

## 2. ⚠️ Analytics: Mixpanel (DONE, but read this)

- **Client:** `lib/analytics.ts` — posts to Mixpanel's raw HTTP ingestion API (no native SDK → OTA-safe). Identity in `lib/anonymousId.ts`. **Developer Mode fully mutes it** (see §1).
- **Token:** `EXPO_PUBLIC_MIXPANEL_TOKEN` in `.env` (gitignored). **`EXPO_PUBLIC_ANALYTICS_ENV=test`** right now — every event/profile is tagged `environment: test`. **FLIP TO `production` in `.env` when a release candidate ships** (takes effect on next OTA/build). Filter Mixpanel reports by `environment`.
- **Event taxonomy** (feature-utilization focus): dailies add/remove/complete, `sponsor_message_sent{sponsor}`, meditation started/completed/stopped, prayers, `literature_opened`/`literature_read{book, duration_seconds}`, speakers `speaker_played`/`speaker_listened{speaker_name, title, duration_seconds, percent_complete}`, `entry_saved{type}`, reach_out, contact_added. **Full reference: `docs/ANALYTICS_EVENTS.md`.**
- **Sponsor rate-limit fix:** `app/sponsor-chat.tsx` counts `sponsor_chat_usage` (written server-side by the sponsor edge fn). ⚠️ **STILL UNVERIFIED:** the `created_at` column name on that table (MCP couldn't confirm — if wrong the limit silently no-ops, fail-open, doesn't crash). Verify via the Supabase CLI.

---

## 3. Open items / next steps

- **OTA the backup batch** (`1497b8af`) when ready — committed + pushed but not yet on the `production` channel.
- **Device-test this session's behavior work** (tsc can't verify): the Today long-press edit morph (blur + rect measure + keyboard nudge inside the draggable list), the tab-bar frosted glass + inline/locked FAB fit on narrow phones, journey share sheets, meditation "Done" flow.
- **Mixpanel:** flip `EXPO_PUBLIC_ANALYTICS_ENV` to `production` for the RC; verify (with Developer Mode OFF) events land in Live View. Confirm the new `speaker_name`/`title` props arrive.
- **Sponsor `created_at` verify** (see §2) — quick Supabase CLI check.
- **Sponsor backend decision — STILL OPEN.** Engine dropdown: Rork (default, unauth 3rd-party) vs Supabase edge fn (GPT/Claude). Recommendation: retire Rork, use the edge fn, hide the dev controls. Not decided.
- **Supabase teardown (manual):** `usage_events` (`sql/drop_usage_events.sql`) + the `meditation_scenes` table are vestigial.
- **Security P0s** (from the older audit `~/.claude/plans/i-d-like-you-to-memoized-fox.md`): server-side sponsor rate limiting, RLS on `app_feedback`/`user_profiles`.
- **App Store submission** — status unknown; last known build `3.0.6 (122)`. Verify before assuming.
- **Settings › Developer group is always visible** (not gated behind the Developer Mode toggle) — flagged as a possible follow-up to gate it.

---

## 4. Key files cheat-sheet

| Concern | File |
|---|---|
| Analytics client (Mixpanel) + dev-mode gate | `lib/analytics.ts` |
| Analytics event reference | `docs/ANALYTICS_EVENTS.md` |
| Today ledger + Edit long-press morph | `app/(main)/(tabs)/index.tsx` |
| Dailies store (subtitle, editDaily, per-day `total`) | `hooks/use-dailies-store.ts` |
| Daily Reflection reader | `components/DailyReflection.tsx` |
| Journey timeline + entry share | `app/(main)/(tabs)/journey.tsx` |
| Trends screen + analytics (completion rate) | `app/(main)/trends.tsx`, `lib/trends-analytics.ts` |
| Tab bar (glass) + inline FAB | `components/navigation/FloatingTabBar.tsx` |
| Pushed-screen Sponsor FAB (locked position) | `components/navigation/GlobalSponsorFab.tsx` |
| Backup & Restore (iCloud-only) | `app/(main)/backup.tsx`, `lib/userDataSync.ts`, `lib/icloudSync.ts` |
| Meditation screen + global session | `app/(main)/meditation.tsx`, `hooks/use-meditation-session.ts` |
| Speaker player + listen analytics | `components/SpeakerPlayer.tsx`, `hooks/useGlobalAudioPlayer.ts`, `app/(main)/speaker-detail.tsx` |
| Big Book reader (only reader) | `components/bigbook-v2/BigBookHtmlReader.tsx` |
| Sponsor chat UI + rate limit | `app/sponsor-chat.tsx` |
| Sponsor edge function | `supabase/functions/sponsor-chat/index.ts` |
| Build config | `eas.json`, `app.json` |

---

## 5. Recent commit trail (newest first)

- `1497b8af` Backup & Restore: iCloud-only; move Start Fresh to Settings › Developer _(pushed, not OTA'd)_
- `b3a653bf` Sunday-first heatmap, glass tab bar + inline locked FAB, speaker name/title analytics, Tools gear cleanup _(OTA'd)_
- `dbafc575` Today edit UX, Daily Reflection icons, meditation Done, journey share, dev-mode analytics gate, per-day completion rate _(OTA'd)_
- `ef3df97b` Update session handoff
- `f8eea693` Feature-utilization analytics + Mixpanel reserved props/profiles
- `4094e60b` Migrate analytics from Supabase to Mixpanel
- `e74ce2d1` Remove classic reader + 41 dead files; prayers/reach-out/trends refinements

---

## 6. Untracked files in the tree

- `SESSION-HANDOFF.md` — this doc.
