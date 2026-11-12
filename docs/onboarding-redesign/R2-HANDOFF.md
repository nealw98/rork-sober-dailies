# Handoff — back arrows + sobriety count screen (R2)

Two changes to the new onboarding tour. Mockup source for R2:
`docs/onboarding-redesign/R2-Counter.dc.html` (HTML from the design canvas — read it for
layout, sizes, colors and copy; it won't render on its own). Show Neal a plan first.

Files involved: `components/onboarding/OnboardingChrome.tsx` (`TourProgress`),
`components/onboarding/CounterStep.tsx`, and the step routing / `BackHandler` in
`components/OnboardingFlow.tsx`.

---

## Part 1 — Back navigation on the tour

- Add an optional `onBack` to `TourProgress`. When set, render a back chevron (‹) at the
  **left end of the progress row**, across from Skip, before the progress bar. Same
  style as the app's other back chevrons: muted gray (`c.textSecondary`) on paper
  screens, white when `onImage` (the reflection screen). 44pt tap target,
  accessibility label "Back".
- Where it goes:
  - counter → welcome
  - reflection → counter
  - read & listen → reflection
  - talk & practice → read & listen
- iPhone swipe-back and the Android back button do the same on those four screens, and
  on the disclaimer (back to talk & practice).
- **Keep what was entered.** Going back to the counter shows their date still filled in
  and the count showing.
- **No back** on welcome, the paywall, or anything after it. On the paywall the Android
  back button does the same as the X. Once they've subscribed and reach Today there's
  no way back into onboarding.
- Tracking: going back and forward still logs `onboarding_step` each time a step is
  shown. Add `onboarding_back_tapped` with prop `from_step`.

---

## Part 2 — Sobriety count screen (`CounterStep.tsx`)

### Layout and colors
- **Background: the same off-white paper (`c.background`) as the other tour screens** —
  not a gradient.
- Top row: back chevron · teal progress bar (segment 1 filled) · Skip (Part 1).
- Centered header: "One day at a time." (serif italic, teal `colors.primaryDark`), then
  **When did you get sober?** (display bold, ~28pt).
- **The coin** (~196pt, scale with screen as today):
  - **Teal gradient**: top-left `#4A9A98` → `colors.primary` (#3D8B8B) → bottom-right
    `#2A6466`. Soft teal drop shadow. Faint white inner rim (6pt, ~14% white).
  - A thin **complete** outer ring ~10pt outside the coin: 1.5pt, teal at ~35%. It is
    decoration only — **never a progress ring**, no milestones, nothing that fills up.
    (Neal: "one day at a time," not working toward a goal.)
  - Inside: the day count (display bold, white, tabular numbers, auto-shrink for big
    numbers) and "days" / "day" (serif italic, white ~92%).
  - Behind the coin: a soft teal radial glow (see animation 3).
- Under the coin:
  - "X years · Y months · Z days" — semibold 15pt, teal `colors.primaryDark`.
  - "That's N hours, one at a time." — serif italic 16pt, `c.textSecondary`
    (N = days × 24, with thousands separators).
- **Remove** anything milestone-related if present ("Next: …" pills, progress rings).

### Day one
"Today is my day one" sets today's date. The coin then reads **Day 1** with the line
"the bravest one", the line under it reads "Welcome. We're glad you're here." and the
serif line reads "Every count starts right here."

### Date field
- White field, 1.5pt border in `c.border`, 14pt radius, centered text ~20pt semibold,
  placeholder "mm/dd/yyyy", numeric keypad, auto-inserts the slashes.
- Label above: "SOBRIETY DATE" (11pt bold, letter-spaced, muted).
- While typing: teal border plus a soft teal focus glow.
- Valid date: border stays teal. Invalid: border `#D8584E` and "That's not a valid
  date" in place of the years/months/days line.
- Keep the existing validation (no future dates, real calendar dates) — same as
  `SoberDateEditor`.

### Buttons
- **Start my count** — the standard teal primary button (`PrimaryButton`, same as every
  other screen), arrow icon. Disabled until the date is valid. Saves with
  `setSobrietyDate(formatLocalDate(date))` and goes to the reflection.
- **Today is my day one** — text button below it, `c.textSecondary`.

### Animation (use `react-native-reanimated`, already installed)
1. **Count-up** — the most important part of the screen. When a valid date is entered
   (and when the screen opens with a prefilled date), the coin pops in slightly
   (scale 0.94 → 1.03 → 1.0 over ~500ms) and the number rolls from 0 to the total over
   ~1.4s with an ease-out curve (fast at first, settling as it lands). Use tabular
   numbers so the digits don't jitter.
2. **Glint** — as the count lands, one soft diagonal white shine (≈40% white, ~45pt
   wide, tilted ~25°) sweeps once across the coin, clipped to the circle (~0.9s).
3. **Breathing glow** — the teal glow behind the coin slowly swells and fades
   (scale 1.0 → 1.1, opacity ~45% → 100%) on a ~5s loop. Calm, not pulsing.
- **Tapping the coin replays** 1 and 2.
- Run on the UI thread (Reanimated shared values), not by re-rendering per frame.
- **Reduce Motion on:** no animations — show the final number immediately, no glint,
  static glow.
- Keep it smooth on older/low-end Android.

### Dark mode, sizes
- Dark mode: follow the app's existing token approach; the coin stays teal.
- Must fit iPhone SE without clipping (shrink the coin as today), work with large
  text, and keep the existing iPhone Duo / wide-layout centered column.

## Check when done
- Light + dark, iPhone SE, large text, Reduce Motion on, Android back, iPhone swipe-back,
  Duo folded/unfolded.
- Back from reflection → counter keeps the date and count.
- Day one, invalid date, and Skip all behave as above; events fire once per showing.
