# Onboarding redesign — "lead with the tools"

Handoff for Claude Code. Designed with Neal on a Claude Design canvas (Nov 8, 2026).
The mockup source for each screen is the `R*.dc.html` file in this folder. They are
HTML mockups from the design canvas, not React Native code, and they won't render on
their own (images point at the canvas). Read them for layout, copy, sizes and colors;
the image files to use are named below and all exist in `assets/images/`. Build the
real screens with the app's existing components, `designTokens`, fonts and dark-mode
handling.

**Ship target:** the upcoming native release (the one adding iPhone Duo support).

## Why

App Store downloads are up (more Apple Ads spend), but fewer of those people tap
Continue on the paywall. Most reach the paywall; they stop there. The current
onboarding sells "daily habits" in the abstract and shows the tools only as small
thumbnails. The redesign shows what people came for — their sobriety count, today's
Daily Reflection, the literature, speaker tapes and AI sponsor — before the ask, and
removes the setup screens after it.

## Do this first, as its own change (can ship OTA before the release)

Add funnel tracking to the **current** flow so we get a before-picture. No screen or
behavior changes. Use `logEvent` from `@/lib/analytics`.

- `onboarding_started` — once, when `OnboardingFlow` first mounts.
- `onboarding_step` each time a step appears, props `step`, `step_index`, `is_member`
  (the frozen `alreadyHadAccess`). Current steps: `welcome`, `inside_1`…`inside_4`
  (each carousel card as it becomes visible, including on swipe), `disclaimer`,
  `paywall` (only when it runs), `date`, `dailies`.
- `onboarding_carousel_skipped` (with card index), `onboarding_disclaimer_accepted`,
  `onboarding_paywall_closed` (X back to Welcome), `onboarding_date_saved` /
  `onboarding_date_skipped`, `onboarding_completed`.
- Fire each step event once per showing, not on re-renders. Keep `paywall_view` as is.
- Add them to `docs/ANALYTICS_EVENTS.md`.

## The new flow

```
welcome → counter → reflection → read_listen → talk_practice → disclaimer
        → paywall (skipped for members, exactly as today) → finish → Today (one-time tip)
```

The `date` and `dailies` steps are removed from onboarding. Keep everything else about
how the flow works today: members skip only the paywall (`alreadyHadAccess` frozen at
mount), the paywall X returns to Welcome, the `onUnavailableDismiss` / internal-preview /
dev bypasses, the Pass It On `passToken` path, and `app/_layout` backstops.

Skip (top right) appears on counter, reflection, read_listen and talk_practice and goes
straight to `disclaimer`. A 4-segment progress bar across the top of those four screens
shows position. Android back / swipe-back should go to the previous step.

### R1 · Welcome (`R1-Welcome.dc.html`)
- Same gradient as today's Welcome (`obvGrad(0.18)`), same dark-mode handling.
- Small app icon + "Sober Dailies" wordmark at top left.
- A collage of real app imagery: Big Book cover (`big-book_cover.webp`, tilted left),
  a Daily Reflections card in the CENTER using Neal's photo `assets/reflection_bg100.webp` (copper alarm clock on a sunny windowsill with a book — no people, so the screen doesn't read as a men's or women's app). Crop to keep the clock in view (anchor bottom-left). A soft white fade at the top of the card, with "DAILY REFLECTIONS" (teal) and "Today's reading" (serif, dark) over it. The source photo is large (3264×4912) — bundle a resized copy (~1000px tall) for the app, a Speaker tapes card (`speakers_hero2.webp`, tilted right; the play button and "Speaker tapes" label sit stacked at the card's bottom-RIGHT corner, because the center card covers its left side),
  and a small chat chip with all three sponsor avatars overlapped (not just one, so no gender leads): "Your AI sponsor" / "I'm here. What's going on?"
- Headline: **Your whole recovery toolkit, in one place**
- Body: "The Big Book, Daily Reflections, speaker tapes, prayers, your sobriety count —
  and a sponsor to talk to at 2am."
- "Get started" button and the Terms / Privacy line, unchanged from today.

### R2 · Sobriety count (`R2-Counter.dc.html`)
- Paper background. Overline "One day at a time." (serif italic, teal), title
  **When did you get sober?**
- A large circular coin (≈220pt, teal→steel gradient) showing the live day count and
  "days", with the "X years · Y months · Z days" line under it — reuse the parsing,
  formatting and `ymdLabel` logic from `SoberDateEditor`.
- Date field (mm/dd/yyyy, numeric keypad) below. Invalid date → red border + message.
- Primary: **Start my count** → saves with `setSobrietyDate(formatLocalDate(date))`,
  goes to reflection. Disabled until the date is valid.
- Secondary text button: **Today is my day one** → saves today's date, continues.
- Members who already have a date see it prefilled (as the old date step did).
- Skipping leaves the date unset (same as old "Skip for now").

### R3 · Today's Daily Reflection (`R3-Reflection.dc.html`)
- Full reading for **today's date**, from the same source the Today page's Daily
  Reflection uses (see `app/(main)/(tabs)/index.tsx` / `useReflectionHeroImage`).
- Top: hero image (~330pt) with "DAILY REFLECTIONS · NOVEMBER 8" overline and the
  title in serif. Progress bar and Skip sit on the image in white.
- Below: the quote (left teal rule) with its source line, then the reflection text.
  Scrollable if long.
- Footer: a small check line "A new reading waits here every morning" and the
  button **See what else is inside**.
- Do not mark the reflection as read/complete here — onboarding has no program yet.

### R4 · Read & listen (`R4-Read-Listen.dc.html`)
- Overline "READ & LISTEN", title **The literature and the speakers, right here**.
- Literature card (steel soft fill): Big Book and 12&12 covers side by side, slightly
  tilted (`big-book_cover.webp`, `new_12x12_cover.webp`), "Literature" / "The Big Book
  and the Twelve and Twelve, always in your pocket."
- Speaker tapes card: `speakers_hero2.webp` full-bleed with dark bottom gradient,
  "Speaker tapes" / "Experience, strength and hope — a meeting's worth, whenever you
  need it.", and a static player row. Fill the speaker line with a real entry from the
  speaker catalog (name · location), not invented text.
- These are static previews (not tappable). Button: **Next**.

### R5 · Talk it through & every day (`R5-Talk-Practice.dc.html`)
- Title **Talk it through, and practice every day**. No overline. Three labeled groups,
  so the screen reads as "when you'd use it" rather than a list of features:
- **TALK IT THROUGH**
  - AI sponsor card (periwinkle soft): the three avatars from `SPONSORS` overlapped,
    "AI sponsor" / "Step questions, a rough day, or just checking in.", then a sample exchange with
    Steady Eddie: user bubble "I'm having a hard time today" and Eddie's reply (purple
    `#8273B5` bubble, white text — same as the old carousel, not green): "Yeah, that's tough — some days just feel heavy. Tell me
    what's actually going on: are you thinking about drinking, or is something else
    weighing on you?" (Neal's copy — already in the app build.)
  - Spot check card (white, terracotta icon): "Spot check inventory" / "Upset right
    now? Work through it on the spot."
- **EVERY DAY** — two equal cards side by side:
  - Prayers (teal): "Morning, evening and the ones in between."
  - Gratitude list (terracotta): "A few lines that change the whole day."
- **WHEN YOU NEED QUIET** — one short image card with `meditation-hero1.webp`:
  "Meditation" / "Its own quiet corner of the app."
- A small muted line: "Plus journal, nightly review, meeting finder and more."
- Static previews, not tappable. Button: **Continue** → disclaimer.

### R6 · Before you begin
Today's `DisclaimerStep`, unchanged.

### R7 · Paywall (`R7-Paywall.dc.html`)
Changes to `PaywallScreen`, **trial variant only**:
- Title **Unlock every tool** (replaces "Pick your plan and start today"). Still no
  trial or price in the title or button — keep that rule.
- When shown from onboarding (add a prop, e.g. `context="onboarding"`), a subtitle:
  "Everything you just saw, plus your count and your daily program." Elsewhere
  (lapsed-user backstop etc.) no subtitle.
- A row of 4 image tiles under the title: Literature (Big Book cover), Reflections
  (`reflection_bg2`), Speakers (`speakers_hero2`), AI sponsor (`ai_sponsor_hero2`),
  ~76pt tall, labels under.
- The trial timeline becomes compact (30pt beads, one line each) so plans and the
  button fit without scrolling on a standard iPhone.
- **Keep untouched:** the Day 7 "…required to maintain access…" sentence with the
  real price, the billing disclosure under the button, plan rows and SAVE badge,
  Restore / Terms / Privacy, the X, the trial-over variant, and everything that
  decides trial eligibility. These exist for App Review / Play policy.

### R8 · First open — Today with a one-time tip (`R8-Today.dc.html`)
- `finish` calls `completeOnboarding()` as today. The program is already the six
  defaults (`DEFAULT_PROGRAM`) — do not seed or overwrite (members may have a
  cloud-restored program).
- On the first Today render after onboarding, show a one-time coach mark: dim the
  screen, keep the dailies area bright, and point at the existing **Edit dailies**
  control on Today. Copy: overline "YOUR DAILY PRACTICES", title "We started you with
  six simple practices", body "Check them off through the day. Tap Edit any time to
  add, remove or reorder — there are lots more to choose from." Button **Got it**.
- Store a flag (e.g. AsyncStorage `today_edit_tip_seen`) so it never shows again, and
  clear it in the Debug Console's onboarding reset.

## Tracking for the new flow
Same event names as above; new `step` values: `welcome`, `counter`, `reflection`,
`read_listen`, `talk_practice`, `disclaimer`, `paywall`. Plus
`onboarding_counter_saved` (prop `method`: `typed` | `day_one`),
`onboarding_counter_skipped`, `onboarding_skip_tapped` (prop `from_step`),
`onboarding_completed`, `today_tip_shown`, `today_tip_dismissed`.
Add a `flow_version: "v2_tools"` prop to every onboarding event so old and new flows
can be compared in Mixpanel.

## Layout and modes
- Dark mode: follow the app's existing token approach (the mockups are light only).
- Wide layouts / iPhone Duo / iPad: follow `docs/3.5-wide-layouts-handoff.md`. The
  onboarding screens can stay a centered single column with a sensible max width.
- Dynamic Type: titles may wrap; nothing may clip. Respect the safe areas.

## Remove
- `WhatsInsideCarousel` from the flow (keep the file until the release is out, then
  delete).
- The `date` and `dailies` steps and `SetupHeader` from `OnboardingFlow`.
  `SoberDateEditor` stays — Today and Settings still use it.

## Testing checklist
- New user, fresh install: every screen, Skip from each of R2–R5, invalid date,
  "Today is my day one", paywall X → Welcome, purchase → Today with tip, tip shows once.
- Member (has access): no paywall; date prefilled on R2; their existing program intact.
- Pass It On link install; plans-unavailable paywall; internal preview channel bypass.
- Dark mode, large text, iPhone SE size, iPhone Duo folded/unfolded, Android back.
- Events appear in Mixpanel with the right `step` and `flow_version`.
