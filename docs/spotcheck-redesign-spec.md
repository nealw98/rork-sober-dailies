# Spot Check Redesign — FINAL spec (2026-08-03)

Source: Claude Design project `232ad149` (`explore/spotcheck-proto.jsx`, the
"C2 form → real chat" prototype) **plus Neal's corrections in session** —
where this doc differs from the prototype, THIS DOC WINS. The prototype's
sponsor copy is MOCK (@ASK-FIRST) and never ships; real voice comes from
`lib/spotCheckLLM.ts`.

## The shape

The multi-step Spot Check wizard is RETIRED. Replaced by ONE form plus the
real sponsor chat.

### Screen 1 — the form (complete in itself)

- Header: back chevron · "Spot Check" title · **Save pill upper-right**
  (like the other notebook editors). Enabled when ≥1 feeling AND non-empty
  text.
- **HOW ARE YOU FEELING?** — the 10 feeling chips, verbatim from
  `constants/spotCheckPersonas.ts`, multi-select, terracotta when on.
- **WHAT'S GOING ON?** — free textarea. Placeholder:
  **"What's happening right now"** (NOT the prototype's walk-through-the-day
  line).
- **Reflection card** (REVISED 2026-08-04, Neal — replaces the static
  Watch For / Strive For card, which couldn't respond to the situation):
  once the form is ready and the user pauses (~2s), the app fetches 1–2
  plain sentences in a NEUTRAL app voice (server persona `reflection`, not
  a sponsor) that respond to the specific feelings+situation combination —
  what's underneath it plus one thing to watch for. Italic serif in the
  teal-soft card. Regenerates after edits; offline/failure shows nothing.
  The 18-pair map (`constants/spotCheckPairs.ts`) is retired from the form
  but kept for wizard-era records.
- **Save** is MANUAL ONLY — standard notebook save + `confirmSaved()`
  OK/View dialog. Talk-it-through does NOT auto-save (prototype's
  save-on-leaving-form + toast: dropped).
- **Split CTA — "Save & talk with {name}"** (REVISED 2026-08-04, Neal;
  terracotta pill, disabled until ready): left segment saves the page (no
  confirmation dialog) and goes straight to the chat via router.REPLACE —
  page one leaves the stack and comes up fresh next time. Right chevron
  segment opens the full-roster sponsor sheet; picking one does the same
  save-and-go.

### Screen 2 — the real sponsor chat (the actual chat surface)

**REVISED (Neal, 2026-08-03 pm): a SEPARATE, EPHEMERAL session** — its own
screen (`app/(main)/spot-check-chat.tsx`), chat-styled, but it NEVER
touches the persona's main thread (an ongoing conversation there is
untouched). **Framing: it is the SAME wizard, split** — pages 1–2 on the
form, pages 3–4 in this chat window. **Done is the ONLY exit** (no
back-to-form chevron — the form was replaced out of the stack); it and
system back land on the screen the flow started from (Today/Tools). The
saved record (form page only) is the durable artifact. Same daily message
cap and crisis scan as the main chat.

1. The chat OPENS with the sponsor asking the page-3 question — no
   welcome line ("no What-fresh-hell opener"), no preamble, no echo of
   the form. The question is generated FROM the form via
   askCausesQuestion; the form content grounds every later turn.
2. User replies (the page-3 causes answer).
3. **Sponsor page-4 turn (hard structure, real generation):** summary of
   the situation + THREE concrete suggestions.
4. RETIRED 2026-08-04: the "Add {name}'s take?" dialog. Nothing in the
   chat writes back to the saved record.
5. From then on: normal chat inside this session (askSpotCheckReply,
   persona voice, spot-check context attached) until Done.

"Hard content but sponsor-AI realness": the two-turn structure is enforced
in the prompt contract; the words are genuinely generated per persona.

No "take" labeling inside the chat — they are ordinary messages.

### The save is the FORM PAGE ONLY (REVISED 2026-08-04, Neal)

- The saved record = feelings + situation + the reflection card's answer.
  Generating a fresh reflection after a save re-arms the Save pill so it
  can be captured by a re-save.
- The chat is separate and writes NOTHING back — the "Add {name}'s take"
  dialog is RETIRED. Old records that carry a take keep rendering it in
  Journey ("What {name} heard"); new records render a "Reflection"
  section instead.

### What does NOT exist

- No save-chat-to-Journey. The transcript's home is the chat thread
  itself, like any conversation. DECIDED 2026-08-03.
- No exit dialog on leaving the chat (prototype's Keep talking / Erase /
  Save to Journey: dropped). Leaving is just leaving a chat.
- No auto-save of the record, no toasts.

### Unsaved-record path

User talks without saving: fine. The conversation is ephemeral either way;
nothing lost, nothing prompted.

## Implementation map (verified against the code, 2026-08-03)

- **Storage**: AsyncStorage key `spot_check_inventories` (defined INSIDE
  `app/(main)/inventory.tsx` line ~36), array of `SpotCheckEntry`
  (`types/spotCheck.ts`), newest-first unshift. KEEP the key and shape —
  Journey reads it. New-form saves leave `causesQuestion/causesAnswer/
  summary/suggestions` null; the take-append later fills `summary`,
  `suggestions`, and `sponsorId` on the saved record by id.
- **Feelings→pairs**: `pairsForFeelings()` + `FEELING_PAIR` now exist in
  `constants/spotCheckPairs.ts` (DONE, uncommitted). Draft mapping —
  stretches flagged in the file comment for Neal's review.
- **LLM turns**: reuse `lib/spotCheckLLM.ts` — `askCausesQuestion` IS
  sponsor turn 1 (probe underneath), `askSummary` IS turn 2 (summary + 3
  suggestions; prompt says 2–3, tighten to exactly 3). `askHandoffOpener`
  + the context-card path retire with the wizard, but KEEP
  `spotCheckCard` rendering in chat (old histories contain those messages).
- **Chat seeding**: replace `SPOT_CHECK_HANDOFF_KEY` flow. New key (e.g.
  `SPOT_CHECK_SEED_KEY` in `constants/spotCheckPersonas.ts`) carrying
  `{ sponsorId, feelings, whatsGoingOn, savedEntryId | null }`.
  `app/sponsor-chat.tsx` has the pickup-effect pattern (~line 145);
  `hooks/use-chat-store.ts` gets `injectSpotCheckSeed`:
  1. append USER message from the form content;
  2. bot turn 1 via `askCausesQuestion` (fallback:
     `getSpotCheckFallbackQuestion`);
  3. set a pending-beat flag; `sendMessage` routes the next user turn to
     `askSummary` (user text = causesAnswer), renders summary + bullets
     as the bot turn, clears the beat;
  4. if `savedEntryId`, append a `takePrompt`-kind message → sponsor-chat
     renders an inline card "Add {name}'s take to your saved spot check?"
     [Add] → updates the stored record, card flips to a clearly-visible
     added state (never a toast).
- **Form screen**: rewrite `app/(main)/inventory.tsx` (558 lines; header/
  chips/input/dock styles at the bottom of the file are reusable as-is).
  Full roster via `SPONSORS` / `getAvailableSponsors()`
  (`constants/sponsors.ts`) — not the 3-persona `SPOT_CHECK_SPONSOR_IDS`.
  Last-used sponsor via `useLastSponsor` (same shared key as the FAB).
- **Save model (DECIDED 2026-08-03, Neal): three states.**
  1. **Save** (pill, upper right): saves in place and STAYS on the form.
     Button flips to a "Saved" state; editing re-arms it; a re-save
     UPDATES the same record (same id), never duplicates.
  2. **Save & close** / 3. **Close without saving**: both live on the
     back chevron. Dirty (unsaved or edited-since-save) → alert:
     "Save this spot check?" [Keep writing / Close without saving /
     Save & close] — Save & close runs the save then `confirmSaved()`
     (OK/View). Clean (saved, unedited) → back just exits, no dialog.
  - Talk-it-through never saves; it carries `savedEntryId` when one
    exists, which is what gates the take prompt in chat.

## Implementation notes

- Form replaces the wizard in `app/(main)/inventory.tsx` (route unchanged;
  Tools card + daily action keep working).
- Chat seeding: reuse the existing spot-check → sponsor-chat handoff
  plumbing (`lib/spotCheckLLM.ts`, sponsor-chat's session handling); the
  two-turn contract lives in the system/handoff prompt.
- Journey record: existing spot check entry shape + optional `take`
  field ({ sponsorId, summary, suggestions[3], addedAt }); Journey detail
  renders it as a distinct "{name}'s take" section.
- The 25/day sponsor cap and disclaimers apply as in any chat.
- Existing saved spot checks (wizard-era) keep rendering in Journey
  unchanged.
