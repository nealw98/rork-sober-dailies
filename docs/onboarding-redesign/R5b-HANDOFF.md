# Handoff — new tour screen: "Your daily program" (R5b)

Add ONE new onboarding step after "Talk it through" and before the disclaimer. This
is the main point of the release — the daily program that ties every tool together —
and the tour didn't show it yet. Mockup source:
`docs/onboarding-redesign/R5b-Program.dc.html` (read it for layout, sizes, colors and
copy; it won't render on its own). Show Neal a plan first. Don't change any other
screen except what's listed under "Wiring".

## Wiring
- New step id **`program`**, between `talk_practice` and `disclaimer` in
  `components/OnboardingFlow.tsx` (the `Step` type, the step-index map, and the
  back map).
  - talk_practice **Continue → `program`** (was → disclaimer).
  - program **Continue → `disclaimer`**.
  - program **Back → `talk_practice`**; disclaimer **Back → `program`** (was
    talk_practice). Same for iPhone swipe-back and the Android back button.
  - Skip on every tour screen still goes straight to the disclaimer.
- The tour is now **5 screens**: set `TOUR_STEPS = 5` in
  `components/onboarding/OnboardingChrome.tsx`. New screen uses `index={4}`; the others
  keep their indexes (counter 0, reflection 1, read & listen 2, talk & practice 3).
- Tracking: `onboarding_step` with `step: "program"` when it shows (once per showing);
  keep the existing step-index numbering in sync.
- Build it as `ProgramStep` (in `ToolsSteps.tsx` next to the other tour screens, or its
  own file) using the same `TourScreen` chrome (paper background, back · progress ·
  Skip, primary button at the bottom), and the existing iPhone Duo / wide-layout
  column.

## The screen
- Overline **YOUR DAILY PROGRAM** (teal, `colors.primaryDark`).
- Title **Put it all together, one day at a time**
- Body: "Pick the daily practices that fit your recovery. Each one opens the tool you
  need, right from your Today page."
- **A Today-style card** (white surface, border, radius 22, soft shadow) showing the
  six default practices from `DEFAULT_PROGRAM`, grouped under section labels
  **Morning / Anytime / Evening** (semibold 14, `c.textSecondary`):
  - Each row: the practice's own icon in its soft tone box (36pt, radius 11, same
    icons/colors as Today), the label (semibold 14), and under it a small link line in
    the tool's color: **"Opens <tool> ›"**:
    - Say my morning prayers → Opens Prayers
    - Write a gratitude list → Opens Gratitude
    - Attend a meeting → Opens Meeting finder
    - Read the literature → Opens the Big Book reader
    - Do my nightly review → Opens Nightly review
    - Say my evening prayers → Opens Prayers
    (Use the real tool each daily is wired to — if a mapping differs in the app,
    follow the app.)
  - Right side: a check circle (26pt). The two **Morning** rows show as done (filled
    teal with a white check); the rest are empty outlined circles. It's an
    illustration of a day in progress — static, not tappable.
  - Hairline dividers between rows inside a section.
- Under the card, small centered muted line: **"We'll start you with these six. Add,
  remove or reorder any time."**
- Primary button: **Start my program** (with arrow) → disclaimer.
- Static preview only: don't read or write the user's real program here (members may
  have their own; the defaults are only what new users start with).

## Fit
Must fit an iPhone SE-size screen (scroll inside if needed), work with large text and
dark mode (follow the existing token approach), and Duo folded/unfolded.

## Check
- Flow: talk & practice → program → disclaimer; back from disclaimer → program; Skip from
  any tour screen → disclaimer.
- Progress shows 5 segments on all tour screens, the last one filled here.
- `onboarding_step` fires for `program`.
