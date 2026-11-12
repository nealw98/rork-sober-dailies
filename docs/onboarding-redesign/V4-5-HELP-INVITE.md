# V4 · Handoff 5 — Make the sponsor screen an invitation to try

Read `V4-OVERVIEW.md` first. Requires handoff 4 (`HelpStep` / `HelpList` exists).
App-only: no server changes.

Mockup: `docs/onboarding-redesign/P-Help-247.dc.html` (the list view).

## Why
The sponsor list reads like a description of what's in the app. "Try" is only in the
small subtitle. This screen should push people to actually send a message.

## Changes (the list view only — chat and Spot Check views are unchanged)
1. **Title:** "The help you need, 24/7" → **"Talk to a sponsor right now"**
2. **Subtitle (muted):** → **"Pick one and send a message. You get 3 free messages with each
   sponsor, plus a free spot check."**
3. **"Try →" pill on every untried card**, at the right end of the name row: filled
   `colors.primary` (#3D8B8B), white bold 13, a small right arrow, pill radius, padding
   ~6×12, soft teal shadow. It makes each card read as something to tap.
   - Once tried, the pill becomes the existing **"✓ Tried"** pill and the card grays out,
     as handoff 4 already does. Never show both.
   - Same for the Spot Check card.
   - Accessibility label: "Try Steady Eddie" (etc.).
4. **Main button stays "Start my free trial"** (or Subscribe / Continue as in handoff 4)
   and is **always visible**. Don't add a "Skip for now" link: the paywall's X returns to
   Welcome, not to this screen, so there's no coming back here.

Keep the 988 line, the card order, the gray-out and everything else from handoff 4.

## Check
- Fresh install: four teal "Try →" pills; try one → it shows "✓ Tried" and grays out.
- Title and subtitle fit on iPhone SE and at large text sizes (wrap is fine; no clipping).
- Light and dark mode; Android.
