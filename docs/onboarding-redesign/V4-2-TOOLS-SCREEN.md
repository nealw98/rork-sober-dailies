# V4 · Handoff 2 — "All the tools you use every day"

Read `V4-OVERVIEW.md` first. Requires handoff 1 (the `tools` step exists).

Mockup: `docs/onboarding-redesign/P-Tools-Everyday.dc.html`.

Build `ToolsStep` (in `components/onboarding/ToolsSteps.tsx`, using the existing
`TourScreen` chrome: paper background, back · progress · Skip, primary button) and render
it for the `tools` step. Progress index 2. Back → reflection. Button **Your daily program** → `program`.

## The screen
- No overline. Title: **All the tools you use every day**
- **Big Book Reader** — the big card, same size as today's Read & listen literature card:
  - Background: light warm cream **`#F3EBDA`** (not blue — the pale 12&12 cover vanishes
    on blue; not navy — too heavy). Dark text.
  - Both covers side by side (`big-book_cover.webp`, `new_12x12_cover.webp`), about
    118×156, tilted −3° / +3°. They're 3D renders with transparent backgrounds:
    `contentFit="contain"`, no radius, no box shadow — a soft shadow that follows the
    book's shape on iOS; on Android skip it if it draws a box.
  - "Big Book Reader" (display bold 19) / "A Kindle-style Big Book reader, plus the
    complete Twelve and Twelve" (14/20, `c.textSecondary`).
- **Speaker tapes** — half the Big Book Reader card's height (~118pt), no photo, no play button:
  - Background `colors.steelSoft` (#E0E6EC). A 48pt navy circle (`colors.steel`) with a
    white microphone icon, then "Speaker tapes" (display bold 18) / "Experience, strength
    and hope — a meeting's worth, whenever you need it." (13.5/19).
- **Three small cards in a row** (equal width, ~8pt gaps), each an icon circle over a title:
  - Prayers — teal soft bg, teal circle, praying hands.
  - Gratitude — terracotta soft bg, terracotta circle, heart.
  - Meditation — periwinkle soft bg, periwinkle circle, lotus.
- Small centered muted line: **Plus journal, nightly review, meeting finder and more.**
- Button: **Your daily program** → `program`.
- Static previews — nothing tappable but the chrome.

## Remove
- Delete `ReadListenStep` and `TalkPracticeStep` (and their now-unused styles/images
  imports) once nothing renders them. Handoff 4 replaces the temporary `help` placeholder —
  if handoff 4 isn't in yet, leave `TalkPracticeStep` in place for `help` and delete it in
  handoff 4.
- `speakers_hero_bright.webp` is no longer used by onboarding after this; leave the file.

## Fit
iPhone SE without clipping (scroll if needed), large text, dark mode (existing token
approach), iPhone Duo spread layout.
