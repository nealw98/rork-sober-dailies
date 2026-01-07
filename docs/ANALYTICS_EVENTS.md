# Sober Dailies Analytics Events

This document describes all usage events sent to the `usage_events` table in Supabase.

---

## Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated primary key |
| `ts` | TIMESTAMP | Event timestamp (ISO 8601) |
| `event` | TEXT | Event type (see below) |
| `screen` | TEXT | Screen name where event occurred |
| `feature` | TEXT | Feature identifier (for `feature_use` events) |
| `duration_seconds` | INTEGER | Time spent on screen (for `screen_close` events) |
| `session_id` | UUID | Unique session identifier |
| `anonymous_id` | TEXT | Persistent user identifier (survives reinstalls via SecureStore) |
| `app_version` | TEXT | App version (e.g., "2.0.0") |
| `platform` | TEXT | `ios` or `android` |

---

## Event Types

### 1. System Events

| Event | When Logged | Fields |
|-------|-------------|--------|
| `app_launch` | App opened from closed state | `platform`, `app_version` |
| `app_background` | App moved to background | `platform`, `screen` |
| `app_foreground` | App returned from background | `platform`, `previous_session_id`, `new_session_id` |
| `session_change` | Manual session change | `previous_session_id`, `new_session_id`, `reason` |
| `daily_check_in` | First app open of the day | `date`, `platform` |

### 2. Screen Events

| Event | When Logged | Fields |
|-------|-------------|--------|
| `screen_open` | User navigates to a screen | `screen`, `reason` (optional) |
| `screen_close` | User leaves a screen | `screen`, `duration_seconds`, `reason` (optional) |

**Reason values:**
- `app_background` - Screen closed because app went to background
- `app_foreground` - Screen opened because app returned from background

### 3. Feature Events

| Event | When Logged | Fields |
|-------|-------------|--------|
| `feature_use` | User performs a tracked action | `feature`, `screen` |

---

## Screen Names

Screen names are derived from route paths:

| Route | Screen Name | Description |
|-------|-------------|-------------|
| `/` or `/(tabs)/index` | `Home` | Home screen with sobriety counter |
| `/(tabs)/chat` | `Chat` | Sponsor selection grid |
| `/sponsor-chat` | `SponsorChat` | Active chat with a specific sponsor |
| `/(tabs)/literature` | `Literature` | Literature menu |
| `/(tabs)/bigbook` | `Bigbook` | Big Book chapter list + reader |
| `/(tabs)/twelve-and-twelve` | `TwelveAndTwelve` | 12&12 reader |
| `/(tabs)/prayers` | `Prayers` | Morning/Evening prayer reader |
| `/(tabs)/gratitude` | `Gratitude` | Gratitude list |
| `/(tabs)/evening-review` | `EveningReview` | Nightly review |
| `/(tabs)/inventory` | `Inventory` | Spot check inventory |
| `/(tabs)/daily-reflections` | `DailyReflections` | Daily reflection |
| `/(tabs)/meeting-pocket` | `MeetingPocket` | Meeting pocket/contacts |
| `/(tabs)/settings` | `Settings` | Settings screen |
| `/about` | `About` | About modal |
| `/support-developer` | `SupportDeveloper` | Support modal |
| `/privacy` | `Privacy` | Privacy policy |
| `/terms` | `Terms` | Terms of service |

---

## Feature Values

### Sponsor Chat Features

| Feature | Description |
|---------|-------------|
| `SponsorMessage_SteadyEddie` | Message sent to Steady Eddie |
| `SponsorMessage_SaltySam` | Message sent to Salty Sam |
| `SponsorMessage_GentleGrace` | Message sent to Gentle Grace |
| `SponsorMessage_CowboyPete` | Message sent to Cowboy Pete |
| `SponsorMessage_CoSignSally` | Message sent to Co-Sign Sally |
| `SponsorMessage_FreshFreddie` | Message sent to Fresh Freddie |
| `SponsorMessage_MamaJo` | Message sent to Mama Jo |

---

## Understanding Sponsor Chat Analytics

Sponsor chat has multiple tracking points:

```
1. User taps "AI Sponsor" on Home → screen_open: Chat
2. User browses sponsor grid → (no event)
3. User taps a sponsor → screen_close: Chat, screen_open: SponsorChat
4. User reads greeting → (no event)
5. User sends message → feature_use: SponsorMessage_[SponsorName]
6. User sends another message → feature_use: SponsorMessage_[SponsorName]
7. User leaves → screen_close: SponsorChat (with duration_seconds)
```

**Key Metrics You Can Calculate:**

| Metric | Query Logic |
|--------|-------------|
| Sponsor selection page views | `screen = 'Chat' AND event = 'screen_open'` |
| Sponsor chat opens (any sponsor) | `screen = 'SponsorChat' AND event = 'screen_open'` |
| Messages by sponsor | `feature LIKE 'SponsorMessage_%' GROUP BY feature` |
| Chat engagement rate | Messages ÷ Chat opens |
| Avg time in sponsor chat | `AVG(duration_seconds) WHERE screen = 'SponsorChat'` |

---

## Understanding Literature Analytics

Literature has limited granularity:

```
1. User taps "Literature" on Home → screen_open: Literature
2. User taps "Big Book" → screen_close: Literature, screen_open: Bigbook
3. User browses chapters → (no event - same screen)
4. User opens chapter → (no event - modal, same screen)
5. User reads for 5 minutes → (no event)
6. User closes reader → (no event - modal close)
7. User leaves Big Book → screen_close: Bigbook (duration includes ALL time)
```

**Current Limitations:**
- Cannot distinguish chapter list browsing vs reading
- Cannot track which chapters are popular
- Cannot track bookmark/highlight creation

**What You CAN Calculate:**

| Metric | Query Logic |
|--------|-------------|
| Literature menu visits | `screen = 'Literature' AND event = 'screen_open'` |
| Big Book sessions | `screen = 'Bigbook' AND event = 'screen_open'` |
| Avg Big Book session length | `AVG(duration_seconds) WHERE screen = 'Bigbook'` |
| 12&12 sessions | `screen = 'TwelveAndTwelve' AND event = 'screen_open'` |

---

## What's NOT Currently Tracked

| Screen/Feature | Gap | Potential Enhancement |
|----------------|-----|----------------------|
| Big Book | Which chapter opened | `BigBook_ChapterOpen_[Name]` |
| Big Book | Chapter reading time | `BigBook_ChapterClose_[Name]` with duration |
| Big Book | Bookmark created | `BigBook_Bookmark` |
| Big Book | Highlight created | `BigBook_Highlight` |
| Big Book | Search used | `BigBook_Search` |
| Daily Reflections | Which date viewed | `DailyReflection_[Date]` |
| Daily Reflections | Date navigation | `DailyReflection_DateChange` |
| Gratitude | Entry saved | `Gratitude_EntrySaved` |
| Evening Review | Review completed | `EveningReview_Completed` |
| Prayers | Which prayer viewed | `Prayer_Morning` / `Prayer_Evening` |
| Sponsor Chat | Which sponsor opened | `SponsorOpen_[Name]` |

---

## Sample SQL Queries

### Daily Active Users
```sql
SELECT 
  DATE(ts) as date,
  COUNT(DISTINCT anonymous_id) as dau
FROM usage_events
WHERE event = 'app_launch'
GROUP BY DATE(ts)
ORDER BY date DESC;
```

### Average Session Duration
```sql
SELECT 
  anonymous_id,
  session_id,
  SUM(duration_seconds) as session_seconds
FROM usage_events
WHERE duration_seconds IS NOT NULL
GROUP BY anonymous_id, session_id;
```

### Screen Popularity
```sql
SELECT 
  screen,
  COUNT(*) as visits,
  AVG(duration_seconds) as avg_seconds
FROM usage_events
WHERE event = 'screen_close' 
  AND duration_seconds IS NOT NULL
GROUP BY screen
ORDER BY visits DESC;
```

### Sponsor Popularity
```sql
SELECT 
  REPLACE(feature, 'SponsorMessage_', '') as sponsor,
  COUNT(*) as messages,
  COUNT(DISTINCT anonymous_id) as unique_users
FROM usage_events
WHERE feature LIKE 'SponsorMessage_%'
GROUP BY feature
ORDER BY messages DESC;
```

### User Engagement Funnel
```sql
WITH user_actions AS (
  SELECT 
    anonymous_id,
    MAX(CASE WHEN event = 'app_launch' THEN 1 ELSE 0 END) as launched,
    MAX(CASE WHEN screen = 'Chat' THEN 1 ELSE 0 END) as visited_sponsor_selection,
    MAX(CASE WHEN screen = 'SponsorChat' THEN 1 ELSE 0 END) as opened_sponsor_chat,
    MAX(CASE WHEN feature LIKE 'SponsorMessage_%' THEN 1 ELSE 0 END) as sent_message
  FROM usage_events
  GROUP BY anonymous_id
)
SELECT 
  COUNT(*) as total_users,
  SUM(launched) as launched,
  SUM(visited_sponsor_selection) as visited_sponsors,
  SUM(opened_sponsor_chat) as opened_chat,
  SUM(sent_message) as sent_message
FROM user_actions;
```

### Daily Usage Per User
```sql
SELECT 
  anonymous_id,
  DATE(ts) as date,
  SUM(duration_seconds) as total_seconds,
  COUNT(*) FILTER (WHERE event = 'screen_open') as screens_visited,
  COUNT(*) FILTER (WHERE feature LIKE 'SponsorMessage_%') as messages_sent
FROM usage_events
GROUP BY anonymous_id, DATE(ts)
ORDER BY date DESC, total_seconds DESC;
```

---

## Anonymous ID Behavior

- **Storage:** iOS Keychain / Android Keystore via `expo-secure-store`
- **Persistence:** Survives app reinstalls on iOS (usually on Android too)
- **Migration:** Existing AsyncStorage IDs auto-migrate to SecureStore
- **Format:** UUID v4

---

## Session Behavior

- **New session created on:**
  - App launch from closed state
  - App returns from background
  
- **Session ID format:** UUID v4

- **Session boundaries:**
  - Each background/foreground cycle = new session
  - Useful for calculating "sessions per user" and "time per session"

---

## Notes

1. **Event throttling:** Non-screen events are throttled to max 1 per second to prevent spam
2. **Orphaned opens:** If app crashes, `screen_close` may not be logged (duration will be null)
3. **Duration precision:** Rounded to nearest second
4. **Batch sending:** Events are queued and flushed every 2 seconds

---

*Last updated: January 2026*

