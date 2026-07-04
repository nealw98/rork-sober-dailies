# Sober Dailies — Mixpanel Analytics Reference

Everything the app sends to Mixpanel, written for building reports/boards.
Client: `lib/analytics.ts` (raw HTTP ingestion API, no native SDK — ships via OTA).

---

## Setup & identity

| Thing | Value |
|---|---|
| Token | `EXPO_PUBLIC_MIXPANEL_TOKEN` in `.env` (baked in at bundle time) |
| `distinct_id` | The per-device anonymous ID (`lib/anonymousId.ts`) — same ID used for grandfather checks / support ID; survives reinstalls on iOS via SecureStore |
| `session_id` | New UUID per cold launch **and** per foreground (a background→foreground cycle = new session) |
| Geo | Derived by Mixpanel from request IP (city/country work automatically) |
| Profiles | People profiles exist (see bottom) — `$set` via the engage API |

### ⚠️ Environment filtering (do this first)

Every event and profile carries **`environment`**: `dev` (dev client) · `test` (all builds until a release candidate) · `production`.

Controlled by `EXPO_PUBLIC_ANALYTICS_ENV` in `.env` — currently **`test`**. Flip to `production` when cutting the RC (takes effect on the next OTA/build).

**In Mixpanel:** add `environment = production` as a default board filter (or look at `= test` while testing). Pre-release data shares the same project, so filter every report.

### Properties on every event

`environment`, `session_id`, `screen` (current screen name), `app_version`, `platform` (`ios`/`android`), plus Mixpanel reserved: `$os`, `$os_version`, `$model`, `$manufacturer`, `$app_version_string`, `$insert_id` (dedupe).

---

## Event catalog

### Sessions & lifecycle

| Event | Properties | Notes |
|---|---|---|
| `app_launch` | — | Cold start |
| `app_foreground` | `previous_session_id`, `new_session_id` | Return from background |
| `app_background` | `session_duration_seconds`, `screen` | Session length lives here |
| `daily_check_in` | `date` | Once per calendar day — **DAU proxy** |
| `session_change` | `reason` | Rare, manual resets |

### Screen usage (generic utilization)

| Event | Properties | Notes |
|---|---|---|
| `screen_opened` | `screen` | Per screen focus |
| `screen_closed` | `screen`, `duration_seconds` | Visits under 2s ignored |
| `screen_time_completed` | `screen`, `duration_seconds`, `open_timestamp`, `close_timestamp` | Duplicate of closed — use one or the other in reports, not both |

**Reports:** screen popularity = count `screen_opened` by `screen`; time by area = sum `duration_seconds` on `screen_closed` by `screen`.

### Today page / Dailies

| Event | Properties | Question it answers |
|---|---|---|
| `daily_added` | `daily` (label), `when` (Morning/Anytime/Evening), `custom` | What people put on their Today page |
| `daily_removed` | `daily` | What they take off |
| `daily_completed` | `daily`, `when`, `custom` | **What actually gets done.** Fires only on the off→on transition (toggling can't double-count). Daily Reflection included (`daily = "Daily Reflection"`) |

**Reports:** completion leaderboard = count `daily_completed` by `daily`. Adds-vs-removes per daily. Profile property `dailies_program` (below) gives current composition per user with no event math.

### AI Sponsor

| Event | Properties | Question |
|---|---|---|
| `sponsor_message_sent` | `sponsor` (SteadyEddie, SaltySam, GentleGrace, CowboyPete, CoSignSally, FreshFreddie, MamaJo) | Chat utilization AND persona popularity — one event, break down by `sponsor` |
| `sponsor_selected` | `sponsor_id`, `sponsor_name` | Picker choices (sponsor-select screen) |

### Meditation

| Event | Properties | Question |
|---|---|---|
| `meditation_started` | `scene`, `minutes` | Scene popularity, chosen lengths |
| `meditation_completed` | `scene`, `minutes` | Finished sits |
| `meditation_stopped` | `scene`, `minutes_planned`, `seconds_elapsed` | Abandoned sits + how far they got |

**Reports:** completion rate = funnel `meditation_started` → `meditation_completed`; scene popularity by `scene`.

### Prayers

| Event | Properties |
|---|---|
| `prayer_viewed` | `prayer` (title), `custom` (user-created vs built-in) |
| `prayer_created` | — (custom-prayer adoption) |

### Literature

| Event | Properties | Question |
|---|---|---|
| `literature_opened` | `book` ("Big Book" / "12 & 12"), `format` (text/pdf), `section` (chapter/essay id) | Which book & section, how often |
| `literature_read` | `book`, `format`, `section` (pdf only), `duration_seconds` | **Time reading, by book.** Fires when a reader closes; clock pauses while backgrounded; <5s ignored |
| `highlight_created` | `book`, `chapter` | Engagement depth |
| `bookmark_added` | `book`, `page` | Fires on add only (not remove) |

**Report:** minutes by book = sum `duration_seconds` on `literature_read` by `book` ÷ 60.

### Speakers

| Event | Properties | Question |
|---|---|---|
| `speaker_played` | `speaker` (talk id), `speaker_name`, `title` | Plays per talk |
| `speaker_listened` | `speaker` (talk id), `speaker_name`, `title`, `duration_seconds`, `position_seconds`, `talk_seconds`, `percent_complete` | One event per listen, fired when it ends (finish / switch talk / stop / player closed). `duration_seconds` = actual playing wall-clock — immune to the ±15/30s skip buttons and playback speed; <5s ignored. `percent_complete` = final position ÷ talk length |

**Reports:** minutes per talk = sum `duration_seconds` by `speaker`; drop-off = avg `percent_complete` by `speaker` (high plays + low % = people bail on that talk).
**Caveat:** a force-killed app loses the final unlogged chunk (backgrounding is fine — audio keeps playing and counting).

### Writing tools

| Event | Properties |
|---|---|
| `entry_saved` | `type`: `gratitude` (+`item_count`) / `journal` / `nightly_review` / `spot_check` (+`defect_count`) |

**Report:** one chart, count by `type` — all four writing tools comparable. Saving from a Today daily also fires `daily_completed` (different question; both fire by design).

### Reach Out

| Event | Properties |
|---|---|
| `reach_out` | `action`: `call` / `text` |
| `contact_added` | `method`: `picker` / `manual` |

### Misc

| Event | Properties |
|---|---|
| `feature_use` | `feature` — generic hook, superseded by the specific events above; may appear from older bundles |
| `developer_mode_toggled` | `is_developer` |

---

## People profile properties

Set via `$set`; view under Users, or break any event down by user property.

| Property | Meaning | Updated |
|---|---|---|
| `environment` | dev / test / production | Every launch |
| `platform`, `$os`, `$model`, `$app_version_string` | Device facts | Every launch |
| `dailies_program` | Array of labels currently on the user's Today page | Every daily add/remove |
| `dailies_count` | Program size incl. Daily Reflection | Same |
| `contacts_count` | # of Reach Out contacts (count only — names/numbers never leave the device) | On add/remove |

---

## Suggested starter board

1. **DAU** — unique users on `daily_check_in`, filtered `environment = production`
2. **Feature leaderboards** — one report each: `daily_completed` by `daily` · `sponsor_message_sent` by `sponsor` · `entry_saved` by `type` · `meditation_started` by `scene` · `prayer_viewed` by `prayer` · `speaker_played` by `speaker`
3. **Time spent** — `literature_read` sum `duration_seconds` by `book` · `speaker_listened` sum by `speaker` · `screen_closed` sum by `screen`
4. **Completion** — funnel `meditation_started` → `meditation_completed` · avg `percent_complete` on `speaker_listened` by `speaker`
5. **Today-page composition** — Users broken down by `dailies_program` / `dailies_count`

## Gotchas

- **Filter `environment` on every report** until the RC ships, then flip `.env` to `production`.
- Events batch every ~2s with retry; queued events are lost only if the app is force-killed before flush.
- No People profile exists for a device until it launches a post-Mixpanel build; `distinct_id` continuity is preserved for all existing users.
- The `environment` value is baked at bundle time — changing `.env` requires an `eas update` to take effect.
