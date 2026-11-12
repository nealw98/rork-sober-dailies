# R5 handoff — "Talk it through, and practice every day"

Update ONE screen: `TalkPracticeStep` in `components/onboarding/ToolsSteps.tsx`.
Mockup source: `docs/onboarding-redesign/R5-Talk-Practice.dc.html` (HTML from the design
canvas — read it for layout, copy, sizes and colors; it won't render on its own).
Don't change any other onboarding step, the flow order, Skip, the progress bar, or the
tracking (`step` stays `talk_practice`).

## What changes

Today the screen is: "TALK & PRACTICE" overline + long title, AI sponsor card, a
"Prayers & meditation" photo card, and a 3×2 grid of tool chips. That grid makes it
feel busy. The new version groups tools by **when you'd reach for them**.

### Header
- Remove the "TALK & PRACTICE" overline.
- Title: **Talk it through, and practice every day**

### Group 1 — label "TALK IT THROUGH" (periwinkle ink, `colors.tertiaryDark`)
1. **AI sponsor card** — keep the current card as it is (periwinkle soft background,
   "AI sponsor" / "Step questions, a rough day, or just checking in.", the three overlapped avatars, and
   the Steady Eddie exchange with the current `SAMPLE_PROMPT` / `SAMPLE_REPLY` copy).
   **One change:** Eddie's reply bubble is **purple** — `colors.tertiary` (#8273B5)
   background with white text — not Eddie's green `bubbleColor`. Same in dark mode.
2. **Spot check card** (new, directly under the sponsor card): white surface card with
   border, a 40pt rounded-square icon box in terracotta soft (`colors.accentSoft`) with
   a terracotta circle-check icon, title **Spot check inventory**, line **Upset right
   now? Work through it on the spot.**

### Group 2 — label "EVERY DAY" (teal ink, `colors.primaryDark`)
Two equal cards side by side:
- **Prayers** — teal soft background (`colors.primarySoft`), 36pt teal circle with the
  praying-hands icon, title "Prayers", line "Morning, evening and the ones in between."
- **Gratitude list** — terracotta soft background (`colors.accentSoft`), 36pt
  terracotta circle with the heart icon, title "Gratitude list", line "A few lines that
  change the whole day."

### Group 3 — label "WHEN YOU NEED QUIET" (periwinkle ink)
- **Meditation** — a short (~78pt) photo card using `MEDITATION_HERO` with the existing
  left-to-right dark gradient, title "Meditation", line "Its own quiet corner of the
  app." (This replaces the taller "Prayers & meditation" card.)

### Footer line
- Remove the tool-chip grid (`TOOL_CHIPS`) entirely.
- Add one small centered muted line above the button:
  **Plus journal, nightly review, meeting finder and more.**

### Button
- **Continue** → disclaimer (unchanged).

## Notes
- Group labels: 11pt bold, letter-spacing ~1.8, uppercase, 8pt above their cards,
  ~18pt between groups.
- Cards are static previews — not tappable.
- Use the same icon sets and tool colors the app already uses (`toolFamily`).
- Dark mode: follow the existing token approach used elsewhere on this screen.
- Must fit on an iPhone SE-size screen without clipping (scroll if needed) and work
  with large text.
- Keep the iPhone Duo spread layout working (`SPREAD_MIN_WIDTH` / `SPREAD_MAX_WIDTH`).
- Also update the R5 section of `HANDOFF.md` only if anything you build differs.

## Check when done
- Light + dark mode, iPhone SE, large text, Duo folded and unfolded.
- Skip and Continue still go to the disclaimer; the `onboarding_step` event for
  `talk_practice` still fires once.
