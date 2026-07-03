# Session Handoff — Sober Dailies

_For a fresh chat. Branch `3.0.5-redesign` (tracks `origin/3.0.5-redesign`), in sync. Latest commit: `f8eea693`. Tree clean except this file + two untracked `assets/autumn-*` files (see §6)._

---

## 0. App & workflow

- **App:** "Sober Dailies" — AA/recovery app. Expo SDK 53, RN 0.79, old arch, bun, EAS, expo-router. Local-first (AsyncStorage/SQLite). Supabase now only for read-only content + the AI-sponsor edge function (analytics moved OFF Supabase, see §3). RevenueCat (paywall disabled via flag). Light mode only (dark deferred).
- **OTA:** production TestFlight build listens on EAS channel **`production`**, runtime **`3.0.6`** (fixed string). Publish JS-only changes with:
  `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 eas update --channel production --message "…" --non-interactive`
- **Hard rule:** NEVER commit / push / OTA / deploy on your own — only when the user explicitly asks.
- **Typecheck baseline:** `npx tsc --noEmit` ≈ **160 pre-existing errors** (was 399 pre-cleanup — the 41-file dead-code purge + analytics migration removed 239 of them). Keep it **at/under 160**; higher = you introduced an error. Remaining are legacy `Colors.light possibly undefined` (BigBookSearchBar, BigBookHighlightsList, MarkdownReader, AnimatedRecognitionMessage) + `headerBackTitleVisible` (check-in, modal).
- User iterates visually + fast via OTA. Don't compromise design to stay OTA-able; native rebuilds are fine.
- **Supabase project ref:** `uzfqabcjxjqufpipdcla`. Sponsor edge fn redeploy: `supabase functions deploy sponsor-chat --project-ref uzfqabcjxjqufpipdcla`. (Supabase MCP is READ-BLOCKED on this project — the CLI works, but MCP `execute_sql`/`list_tables` return permission errors.)

---

## 1. What shipped this session (all OTA'd to production channel)

Big arc was a **meditation redesign**, a new **Trends** page, **custom prayers**, **Big Book highlights list**, a **dead-code purge**, and an **analytics migration to Mixpanel**.

- **Meditation** (`app/(main)/meditation.tsx` + `hooks/use-meditation-session.ts`):
  - Autumn Sky scene w/ looping soundtrack; scenes are now **hardcoded pointing at Supabase bucket files** (`hooks/useMeditationScenes.ts`) — the `meditation_scenes` DB table is no longer used.
  - Calm-style split: a persistent **ambience bed** (tied to the screen + selected scene, keeps playing when locked, stops on navigate-away) decoupled from the **timer** (Begin/Pause/Stop control only the countdown). Global `MeditationSessionProvider` — a sit survives navigation/lock/background; timer anchored to an absolute end-timestamp.
  - **Preferences** sheet (gear icon): Scene Volume (one level for all audio incl. bell) + "Play outside this page" toggle. Editable custom-timer length (type or +/-). Per-day meditation log (`hooks/use-meditation-log.ts`) → shown on Journey.
- **Trends** page (`app/(main)/trends.tsx`, `lib/trends-analytics.ts`) — opened from a button in the Journey header. Active-streak accordion (Dailies + Daily Reflection, zeros hidden, "More"/"Less"), monthly progress heatmap, insights. All computed from real local dailies-completion history.
- **Custom prayers** — live in `app/(main)/prayers.tsx` (My Prayers section above All Prayers, dashed "Add a prayer" button, edit/delete via `components/PrayerEditSheet.tsx`, store `hooks/use-user-prayers-store.ts`). NOTE: the old `components/PrayersMain.tsx` was dead and is now deleted.
- **Big Book highlights** — a Highlights list in `BigBookContents` (find card next to Bookmarks) → tap a highlight → HTML reader opens at its chapter, scrolls to the exact paragraph, and pulses just the highlighted text.
- **Keyboard Done bar fully removed** (global + `KeyboardModalScope`); `KeyboardProvider` stays so `KeyboardAwareScrollView` still lifts inputs. Every input dismisses via its own button / backdrop / return key / `keyboardShouldPersistTaps`.
- **Reach Out** now offers manual name+phone entry (action sheet → modal), not just the contacts picker.
- **Classic Big Book reader removed** — `BigBookHtmlReader` is the only reader now.
- **Dead-code purge:** 41 verified-dead files deleted (see commit `e74ce2d1`).
- Small fixes: go-to-page inputs blanked; sponsor FAB hidden on meditation + trends screens.

---

## 2. ⚠️ Analytics: Supabase → Mixpanel (DONE, but read this)

- **Client:** `lib/analytics.ts` — posts to Mixpanel's raw HTTP ingestion API (no native SDK → OTA-safe). Identity extracted to `lib/anonymousId.ts` (used for grandfather checks / support ID / sponsor API too, not just analytics).
- **Token:** `EXPO_PUBLIC_MIXPANEL_TOKEN` in `.env` (gitignored). **`EXPO_PUBLIC_ANALYTICS_ENV=test`** right now — every event/profile is tagged `environment: test`. **FLIP TO `production` in `.env` when a release candidate ships** (takes effect on next OTA/build). Filter Mixpanel reports by `environment`.
- **Event taxonomy** (feature-utilization focus; option-as-property so Mixpanel segments one event): dailies add/remove/complete, `sponsor_message_sent{sponsor}`, meditation started/completed/stopped, prayers, `literature_opened`/`literature_read{book, duration_seconds}`, speakers `speaker_played`/`speaker_listened{duration_seconds, percent_complete}`, `entry_saved{type}`, reach_out, contact_added. People profiles carry `dailies_program`, `contacts_count`. **Full reference: `docs/ANALYTICS_EVENTS.md`.**
- **Removed:** `lib/usageLogger.ts`, the `log-usage-event` edge function (deleted from Supabase), the `usage_events` type in `lib/supabase.ts`, and two dead hooks.
- **Sponsor rate-limit fix:** `app/sponsor-chat.tsx` counted `usage_events` (now dead) for its daily/monthly message cap → repointed at **`sponsor_chat_usage`** (written server-side by the sponsor edge fn). ⚠️ **VERIFY** the `created_at` column name on that table (assumed the schema convention; MCP couldn't confirm — if wrong the limit silently no-ops, same fail-open as before, doesn't crash).

---

## 3. Open items / next steps

- **Supabase teardown (manual):** `usage_events` table is now dead — `sql/drop_usage_events.sql` is ready to run in the SQL editor (or archive). The `meditation_scenes` table + `sql/create_meditation_scenes.sql`/`add_autumn_sky_scene.sql` are also now vestigial (scenes are hardcoded).
- **Mixpanel verification:** on TestFlight, cold-launch → poke features → confirm events land in Mixpanel Live View tagged `environment: test`. (Can't be checked from the repo.)
- **Device-test the recent UI-behavior work** (WebView/keyboard/layout can't be verified via tsc): Big Book highlight jump+pulse (esp. cross-chapter), meditation Preferences + keyboard-avoidance on the setup screen, custom-prayer add/edit + morph-open, reach-out manual save.
- **Sponsor backend decision — STILL OPEN.** In-chat engine dropdown picks Rork (default, unauth 3rd-party) vs Supabase edge fn (GPT/Claude). Recommendation on record: retire Rork, use the edge fn, remove/hide the dev controls. Not decided.
- **App Store production submission** — status unknown to this session; last known (older handoff) was build `3.0.6 (122)` on `eas.json image:"latest"` (Xcode 26). Verify whether it's submitted/approved before assuming.
- **Codebase audit** from an earlier session lives at `~/.claude/plans/i-d-like-you-to-memoized-fox.md` — its analytics→Mixpanel recommendation is now DONE; security P0s (server-side sponsor rate limiting, RLS on `app_feedback`/`user_profiles`) remain.

---

## 4. Key files cheat-sheet

| Concern | File |
|---|---|
| Analytics client (Mixpanel) | `lib/analytics.ts` |
| Anonymous device ID | `lib/anonymousId.ts` |
| Analytics event reference | `docs/ANALYTICS_EVENTS.md` |
| Meditation screen + Preferences | `app/(main)/meditation.tsx` |
| Meditation global session (timer+ambience+bell) | `hooks/use-meditation-session.ts` |
| Meditation scenes (bucket-file pointers) | `hooks/useMeditationScenes.ts` |
| Per-day meditation log | `hooks/use-meditation-log.ts` |
| Trends screen + analytics | `app/(main)/trends.tsx`, `lib/trends-analytics.ts` |
| Prayers (live) + custom prayers | `app/(main)/prayers.tsx`, `components/PrayerEditSheet.tsx`, `hooks/use-user-prayers-store.ts` |
| Big Book reader (only reader) + highlight jump | `components/bigbook-v2/BigBookHtmlReader.tsx`, `BigBookMain.tsx`, `BigBookContents.tsx` |
| Reach Out (manual + picker add) | `app/(main)/reach-out.tsx` |
| Sponsor chat UI + rate limit | `app/sponsor-chat.tsx` |
| Sponsor edge function | `supabase/functions/sponsor-chat/index.ts` |
| Reading-time hook (shared readers) | `hooks/useReadingTime.ts` |
| Build config | `eas.json`, `app.json` |

---

## 5. Recent commit trail (newest first)

- `f8eea693` Feature-utilization analytics + Mixpanel reserved props/profiles
- `4094e60b` Migrate analytics from Supabase to Mixpanel
- `e74ce2d1` Remove classic reader + 41 dead files; prayers/reach-out/trends refinements
- `48b7bdce` Journey Trends button
- `6134af7a` Trends screen (streaks, heatmap, insights)
- `0b84f06b` Big Book highlights list + meditation keyboard avoidance
- `d4dd1d93` Meditation time on Journey, remove keyboard Done bar, simplify scenes
- `ebdd2800` Meditation audio redesign, custom prayers, keyboard/modal fixes
- `1e3da760` Meditation: persist the sit globally
- `4c0359f0` / `2a4ca003` Meditation volume slider / Autumn Sky scene

---

## 6. Untracked files in the tree

- `SESSION-HANDOFF.md` — this doc.
- `assets/autumn-sky-meditation.mp3` (30 MB) + `assets/autumn-sunrise.webp` — the originals of the Autumn Sky scene, **now served from Supabase buckets** and unused locally. Safe to delete (kept out of git to avoid bloating the repo).
