# V4 · Handoff 1 — New step order, Skip on Welcome, labels

Read `V4-OVERVIEW.md` first. Groundwork so handoffs 2 and 4 drop into place.

Files: `components/OnboardingFlow.tsx`, `components/onboarding/CounterStep.tsx`,
`components/onboarding/ReflectionStep.tsx`, `components/onboarding/ToolsSteps.tsx`
(`ProgramStep`), `components/onboarding/OnboardingChrome.tsx`.

## 1. New step order
Change the `Step` type, `STEP_INDEX` and `PREV_STEP` in `OnboardingFlow.tsx` to:

```
welcome(0) → disclaimer(1) → counter(2) → reflection(3) → tools(4) → program(5) → help(6) → paywall(7)
```

- **The disclaimer moves to second**, right after Welcome. It works exactly as today
  (checkbox, Continue, saves the agreement) — only its place changes. After it: the
  counter (or, if they tapped Skip on Welcome, the paywall — see 2).
- Add two steps, `tools` and `help`. Until handoffs 2 and 4 land, render them with the
  existing `ReadListenStep` (for `tools`) and `TalkPracticeStep` (for `help`) so the flow
  keeps working. Don't build the new screens here.
- After `help` → paywall. Members (already have access) skip the paywall and finish to
  Today, as today.
- Progress `index`: counter 0, reflection 1, tools 2, program 3, help 4 (`TOUR_STEPS`
  stays 5).
- Back: disclaimer → welcome; counter → **welcome** (not back to the consent they just
  gave); reflection → counter; tools → reflection; program → tools; help → program.
  iPhone swipe-back and Android back follow the same map.
- Set `FLOW_VERSION = "v4_help"`. The `onboarding_step` event uses the new step ids.

## 2. Skip
- **Welcome gets a Skip** — top right, same style as the tour screens' Skip (white,
  semibold 15, over the collage; keep it clear of the status bar / Dynamic Island).
  Skip → disclaimer, and remember that they skipped: after they agree, go straight to the
  paywall (members: Today). Log `onboarding_skipped` with `from: 'welcome'`.
- **Skip on the tour screens** (counter → help) now goes to the **paywall** (members:
  Today) instead of the disclaimer — consent is already done.
- Someone who skips the counter has no sobriety date; that's fine — Today already handles
  "no date yet" (check it does).

## 3. Button labels (each names the next screen)
| Screen | Button |
|---|---|
| Sobriety count (`CounterStep`) | "Start my count" → **"Today's Daily Reflection"** (keep the arrow; still saves the date; still disabled until the date is valid) |
| Daily Reflection (`ReflectionStep`) | "See what else is inside" → **"See your everyday tools"** |
| Your daily program (`ProgramStep`) | "Start my program" → **"Try the AI sponsors"** (still saves the default program, as today) |

Welcome ("Get started") and the disclaimer ("Continue") stay as they are. The `tools`
and `help` buttons are set by handoffs 2 and 4.

## 4. Your daily program — "Done" pills, not check circles
In `ProgramStep` (`ToolsSteps.tsx`) the rows end in check circles (`programCheck` /
`programCheckTodo`). The real Today page uses a **Done** pill instead, so match it: reuse
or copy the `DoneButton` look from `app/(main)/(tabs)/index.tsx` (pill, 1.25 border,
"Done" semibold 11.5). Keep **two rows shown as done** (the two Morning rows): those pills
are **solid teal** (`colors.primary`, #3D8B8B) with a white check + white "Done", whatever
the row's tool color. Not-done rows: outline in the row's tool color at ~60%, "Done" in
the tool color. Display only — not tappable here. Mockup: `R5b-Program.dc.html`.

## 5. Daily Reflection — remove one line
If the screen shows any "A new reading waits here every morning" line (or similar note
under the reading), remove it. The reading leads straight into the button.

## Check
- Click through: Get started → disclaimer → Today's Daily Reflection → See your everyday
  tools → (placeholder tools) → Your daily program screen → Try the AI sponsors →
  (placeholder help) → paywall.
- Welcome Skip → disclaimer → paywall. Tour Skip → paywall. Member → Today, no paywall.
- Back from each screen lands where section 1 says; date still filled in on the counter.
- Mixpanel: `onboarding_step` shows the new ids and indexes.
