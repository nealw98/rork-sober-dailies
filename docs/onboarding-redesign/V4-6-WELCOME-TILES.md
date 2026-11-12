# V4 · Handoff 6 — Welcome screen: tiles instead of the fan

Read `V4-OVERVIEW.md` first. App-only. Replaces the Welcome collage (the tilted fan of
Big Book / Daily Reflection / speaker card + the white AI sponsor pill) in
`components/OnboardingFlow.tsx` (`WelcomeCollage` and its `collage*` styles).

Mockup: `docs/onboarding-redesign/V4-6-welcome-mockup.png` (a recreation — the headline
font in it is a stand-in; keep the app's real fonts).

Everything else on Welcome stays: gradient, wordmark + Skip, headline "Your whole recovery
toolkit, in one place", body copy, "Get started", the Terms/Privacy line.

## Layout
A tile grid in the space between the wordmark row and the headline, the width of the
text column (no overhang past the page margins), 10pt gaps.

**Row 1 — three equal tiles, ~132pt tall** (radius 20, clipped, shadow ~0 10 24 at ~28%):

| Tile | Background | Overline (bold 9.5, letter-spacing 1.4) | Title (serif 15/18) |
|---|---|---|---|
| Reflections | `onboarding-reflection-clock.webp`, cover, positioned so the clock shows (left ~30%, bottom); white fade at the top (85% → 0 by half height) | **DAILY** in teal 700 | **Reflections**, `#232529` |
| Big Book | warm cream `#F3EBDA`; `big-book_cover.webp` ~70% wide, centered, tilted −6°, running off the bottom edge, shape-following drop shadow (iOS shadow / Android `filter: dropShadow`, as today) | **READ** in terracotta dark `#8B4E3A` | **Big Book**, `#232529` |
| Speakers | `speakers_hero2.webp`, cover; dark fade at the top (60% → 0 by ~55%) | **LISTEN** in white 90% | **Speakers**, white |

All labels top-left, 12pt in. No play button.

**Row 2 — the AI sponsor tile, full width, ~196pt tall** (same radius/shadow):
- Background `#FCFBF8` (the real chat page's paper).
- Top row: the three sponsor avatars (Eddie, Grace, Sam — `SPONSORS` avatars), 44pt
  circles, 2pt white ring, overlapping −12; beside them the overline **AI SPONSORS · 24/7**
  (bold 9.5, letter-spaced, periwinkle dark `#605786`) and the title **Someone to talk to at
  2am** (serif 18, `#232529`).
- Below, a two-bubble sample in the real chat's style:
  - user (right): **"I really want a drink tonight."** — teal `colors.primary`, white text 13.5,
    radius 16 with the bottom-right corner 4.
  - sponsor (left, max ~85% width): **"I hear you. Let's get through tonight together."** —
    white, `#232529` text 13.5, radius 16 with the bottom-left corner 4, soft shadow.

## Sizing
- The grid is a picture: labels keep their size (`allowFontScaling={false}`, as the collage
  does today) and the whole grid scales down on short screens / large text, as the current
  collage does (measure the copy, give the grid what's left, min scale ~0.75, then scroll).
- Phones: keep the copy at the bottom above the button; split leftover space evenly above
  and below the grid so it doesn't float at the top.
- Tall screens (iPad, unfolded Duo): keep the current "center the group" behavior; cap the
  grid width at the onboarding column width.
- Light and dark: the tiles are photos/fixed colors, so they look the same in both.

## Clean up
Remove the fan's styles and the `collagePlay` / speaker label pieces that are no longer used.

## Check
iPhone SE, standard iPhone, Pro Max, Android, iPhone Duo folded/unfolded, iPad; largest
text size; light/dark. Nothing clipped, bubbles don't overflow their tile.
