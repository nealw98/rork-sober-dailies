# Handoff — Welcome screen collage images only

Change ONLY the four pieces of the collage in `WelcomeCollage` in
`components/OnboardingFlow.tsx`. Don't touch anything else on the Welcome screen
(gradient, wordmark, headline, body, button, Terms line, scaling/scroll logic).
Mockup source: `docs/onboarding-redesign/R1-Welcome.dc.html` (read it for exact sizes;
it won't render on its own). Show Neal a plan first.

**Why:** no single person on the first screen, so it doesn't read as a men's or women's
app; each card has its own color so they don't blend; the Big Book carries the same
weight as the other cards.

Mockup coordinates are inside a 334 × 330 collage box (keep the existing collage
scaling — everything below scales together).

## 1. Big Book (left)
- The cover image `big-book_cover.webp` is a **3D book with a transparent background**.
  Don't put it in a card: **remove** the rectangular card/frame, rounded corners and
  box shadow around it (`collageBookCard`), and don't crop it.
- Show the whole image (`contentFit="contain"`), about **146 × 192**, left −4, top 22,
  rotated **−7°**.
- Shadow that follows the book's shape (iOS: shadow on the image itself works with
  transparency; Android: no elevation box — use a soft blurred shadow image or skip).
  Roughly: offset y 14, blur 18, black 38%.

## 2. Today's reading card (center, in front)
- 170 × 220 at left 82, top 0, radius 18, existing drop shadow.
- **Image:** `assets/reflection_bg100.webp` (Neal's copper alarm clock on a sunny
  windowsill). It's 3264 × 4912 — add a resized copy (~1000px tall) to the bundle and
  use that.
- Crop so the **clock stays in view**: anchor bottom, slightly left (≈30% horizontal,
  100% vertical). The bright window fills the top.
- Replace the dark bottom gradient with a **soft white fade at the top**: white 82% → 50%
  → 0% over the top ~90pt.
- Text moves to the **top**, dark on the light fade: "DAILY REFLECTIONS" (9pt bold,
  letter-spaced, teal `colors.primaryDark`) and "Today's reading" (serif ~19pt, `#232529`),
  14pt in from the top-left. Same in dark mode (it sits on a photo).
- Drop `reflection_bg3.webp` from here.

## 3. Speaker tapes card (right)
- Image, size (140 × 176), position (right 0, top 30), rotation (+8°) and dark bottom
  gradient unchanged.
- The center card covers this card's left side, so the play button and label were
  hidden. Move them to the **bottom-right corner, stacked and right-aligned**: the white
  play circle (30pt) on top, then "Speaker" / "tapes" on two lines (12pt bold, white),
  12pt in from the right and bottom.

## 4. Sponsor chat chip (bottom)
- Replace Gentle Grace's single avatar with **all three sponsor avatars overlapped**
  (from `SPONSORS`, Steady Eddie · Gentle Grace · Salty Sam), 30pt each, white 2pt ring,
  overlapping by 10pt.
- Name line: **"Your AI sponsor"** (instead of "Gentle Grace"). Message line unchanged:
  "I'm here. What's going on?"
- Chip position and styling unchanged.

## Check
- Phone, iPhone SE, large text (collage shrinks as today), iPhone Duo folded/unfolded,
  dark mode.
- Book shows whole with no box around it; clock visible on the reading card;
  "Speaker tapes" + play button fully visible; three faces on the chip.
