# V4 · Handoff 3 — Paywalls: free-trial tweaks + returning-user features list

Read `V4-OVERVIEW.md` first. Independent of handoffs 1, 2 and 4.

Mockup: `docs/onboarding-redesign/Paywall-NoTrial.dc.html`.

File: `components/PaywallScreen.tsx`. Two parts: A changes the **free-trial** variant
(`showTrial`), B changes the **no-trial** variant (`!showTrial`).

## A. Free-trial paywall (`showTrial`)

1. **Button:** "Continue" → **"Start my free 7 days"**. Build the number from the same
   trial length the store reports (the one the timeline's "Day N" uses), so it's never
   wrong if the trial length changes: `Start my free ${days} days`. If the length isn't
   known yet, show **"Start my free trial"**. The no-trial button stays **Subscribe**.
2. **Tile order** (`TOOL_TILES`): **AI sponsor, Reflections, Speakers, Big Book reader.**
   - Rename the literature tile's label "Literature" → **"Big Book reader"** (it keeps the
     two-covers drawing). Let it shrink to fit (`adjustsFontSizeToFit` is already there).
3. **AI sponsor tile photo:** replace `ai_sponsor_hero2.webp` (the group at a table — it
   reads as a meeting) with **Steady Eddie** — use his avatar, the same image as
   `constants/sponsors.ts` (`steady_eddie4.webp`). Fill the tile (`cover`), keep his
   face in frame (bias the crop toward the top if needed). It should read as *your
   sponsor*, not a meeting.
4. **Leave the Day 7 timeline line exactly as it is.** "…is required to maintain access to
   the app" is the Google Play disclosure this screen was once rejected for missing — do
   not reword or remove it.

## B. Returning-user paywall (`!showTrial`) — features, not benefits

Someone who already used a free trial, or a lapsed subscriber.
Replace the benefits card (`BENEFITS`, the gradient rail and the four rows) with a plain
features list. Returning members already know why these matter — just name them.

- Card: surface, border, radius 22, small shadow, padding ~16.
- Small label at the top: **EVERYTHING IN SOBER DAILIES** (11pt bold, letter-spaced, muted).
- Two-column grid, 12 items, each a 26pt rounded-square icon tile in the tool's soft color
  with its ink-colored icon, then the name (semibold 13). Names wrap to two lines if needed.

| # | Name | Tone |
|---|---|---|
| 1 | Daily program planner | teal |
| 2 | Sobriety counter | teal |
| 3 | Daily Reflections | teal |
| 4 | Big Book & 12&12 | steel |
| 5 | Speaker tapes | steel |
| 6 | AI sponsors | periwinkle |
| 7 | Spot check inventory | terracotta |
| 8 | Prayers & meditation | teal |
| 9 | Gratitude list | terracotta |
| 10 | Journal | teal |
| 11 | Nightly review | periwinkle |
| 12 | Meeting finder | steel |

Use the app's existing icons and `toolFamily` tones for each tool where they exist.

## Keep word for word (store rules)
- Title "Your free trial is up" and the "Subscribe to access the app." line.
- Plans, SAVE badge, **Subscribe** button, the "Billed … Renews automatically until
  cancelled. Cancel anytime in Settings." line, Restore Purchases · Terms · Privacy, the X.
- Everything that decides trial eligibility.

The no-trial screen should now fit on a standard iPhone without scrolling.

## Check
Debug Console → paywall previews "trial" and "notrial" (light/dark, large text, iPhone SE, Duo).
