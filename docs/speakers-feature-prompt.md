# Speakers Feature — Build Prompt

## Overview
Add a Speakers feature to the app. This is a library of 35 AA speaker recordings hosted on YouTube. Users browse speakers by theme, tap one, and listen via an embedded YouTube player. The videos are static images with audio — so the UI should treat this as an audio listening experience with a minimized YouTube player.

---

## 1. Home Screen — Add Speakers Button

Add a new full-width card/button on the home screen:
- **Position:** Below the AI Sponsor / Literature row, above the MORNING section
- **Size:** Full width, same style as the Daily Reflection card
- **Label:** "Speakers" with a short subtitle like "35 AA Speaker Stories"
- **Icon:** Use a microphone or audio-wave style emoji/icon consistent with the other home screen cards
- **Tap behavior:** Navigate to the Speakers Browse screen

---

## 2. Supabase Table — `speakers`

Create a table called `speakers` with these columns:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto-generated |
| speaker | text | Name with last initial (e.g. "Adam T.") |
| hometown | text | City, State |
| meeting | text | Meeting name (metadata, not displayed) |
| date | date | Date of the talk (some are null) |
| title | text | Content-based title (e.g. "Ten Xanax at Disneyland") |
| subtitle | text | One sentence story summary |
| sobriety_years | text | Milestone at time of talk (e.g. "25 years", "~5 years") |
| core_themes | text | Comma-separated themes (e.g. "Surrender, Family, Service") |
| audience | text | One of: Newcomer-friendly, General, Old-timer, Women in Recovery, Men in Recovery |
| explicit | boolean | True if talk contains strong language |
| substances | text | "Alcohol", "Alcohol and Drugs", etc. |
| youtube_id | text | YouTube video ID (e.g. "SmqfC1vj4Fk") |
| youtube_url | text | Full YouTube URL |
| quote | text | One memorable quote from the talk |
| created_at | timestamptz | Default now() |

Import data from the CSV file: `speakers_final.csv` (35 rows, all YouTube IDs verified).

---

## 3. Speakers Browse Screen

A scrollable list of speaker cards. Each card shows:
- **Speaker name** and **hometown**
- **Title** (the content-based title — this is the primary text)
- **Duration** (if available) and **sobriety years**
- **Core themes** as small tags/chips
- **Explicit badge** ("E" or similar) if `explicit` is true
- **Play button** on the right side of the card

### Sort
At the top of the browse screen, add a simple sort toggle with three options:
- **Newest** (default) — sort by date descending. Speakers with null dates go to the end.
- **Oldest** — sort by date ascending. Speakers with null dates go to the end.
- **A–Z** — sort alphabetically by speaker name.

Display this as a small row of tappable options (e.g. text buttons or segmented control). Keep it minimal.

---

## 4. Speaker Detail / Player Screen

When a user taps a speaker card, navigate to the player screen showing:

### Speaker Info Section
- **Speaker name** and **hometown**
- **Title** (large, prominent)
- **Subtitle** (story summary)
- **Quote** in a styled quote block (italic, with left border or quotation marks)
- **Core themes** as tags/chips
- **Explicit badge** if applicable
- **Metadata row:** sobriety years, date of talk, audience level

### YouTube Player — Thin Bar with Equalizer Overlay
- Use `react-native-youtube-iframe` package
- Set the player height to approximately 50-60px
- Position a custom equalizer animation overlay on top of the player strip
- The equalizer should show animated bars when audio is playing, static when paused
- Include a small YouTube logo/badge so it's clear where audio is coming from

### Custom Controls
Build custom playback controls that send commands to the YouTube player via its ref:
- **Play / Pause** button (large, centered)
- **Skip back 15 seconds** button
- **Skip forward 30 seconds** button
- **Progress bar** showing current position and total duration
- **Time display** showing elapsed / total (e.g. "19:45 / 56:33")
- **Playback speed** selector: 0.75x, 1x, 1.25x, 1.5x

### Navigation
- Back button to return to browse screen
- If user taps a different speaker from the browse screen, load that speaker and start playing

---

## 5. Technical Notes

### YouTube Player
- Install `react-native-youtube-iframe` and its dependency `react-native-webview`
- The YouTube player ref exposes methods: `seekTo()`, `getCurrentTime()`, `getDuration()`
- Use the `onStateChange` callback to track play/pause/ended states
- Construct video URLs from `youtube_id` column — no need to store full URLs in the player logic
- Thumbnails can be loaded from: `https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg`

### Data
- Fetch speakers from the `speakers` Supabase table
- Core themes are stored as a comma-separated string — split on comma for filtering and displaying as individual tags
- The `quote` column may be null for some speakers (currently 1 out of 35) — hide the quote block if null

### Matching App Style
- **Do not hardcode colors, fonts, or specific design tokens.** Use whatever theme/style system is already established in the app.
- Match the card style, spacing, border radius, and typography patterns used on existing screens (Home, Daily Reflection, Literature, etc.)
- The home screen button should look like it belongs with the existing cards

---

## 6. File Structure Suggestion

```
screens/
  SpeakersScreen.tsx          — Browse/list screen
  SpeakerDetailScreen.tsx     — Player screen

components/
  SpeakerCard.tsx             — Individual card for browse list
  SpeakerPlayer.tsx           — YouTube player + equalizer + controls
  EqualizerOverlay.tsx        — Animated equalizer bars component
```

---

## Summary of Screens and Navigation

```
Home Screen
  └── [Speakers button] → SpeakersScreen (browse/filter)
                              └── [Tap speaker card] → SpeakerDetailScreen (player)
```
