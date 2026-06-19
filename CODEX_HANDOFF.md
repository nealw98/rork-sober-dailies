# Sober Dailies 3.0 — Codex Handoff

This is the durable handoff between Codex chats and computers. Read this file
before changing code. Update it before ending a meaningful work session, then
commit the update with the related code.

Use `$session-start` when beginning on either computer and `$session-end` before
switching computers or ending a meaningful implementation session.

## Current state

- Branch: `codex/3.0-redesign`
- Starting baseline: `678aa54`
- Latest completed checkpoint: `d7d97c1` — Remove paywall and add Archivo foundation
- Session workflow checkpoint: `9744028` — Add start and end session skills
- Phase 1 checkpoint: Build shared iOS shell and scalable typography
- Current target: iOS only. Android adaptation is a separate phase after iOS is complete.
- Design source package: `Sober Dailies-3.zip` (not committed; supplied separately)

## Authority order

When design artifacts disagree, use:

1. The user's latest explicit decision
2. `CODEX_HANDOFF.md`
3. `CLAUDE.md` from the design package for data/storage contracts
4. `progress.md` from the design package
5. `DESIGN-DECISIONS.md` from the design package
6. Older canvases and screenshots as historical reference

## Locked product decisions

- All net-new features in the design are included in the 3.0 release.
- The first implementation phase is iOS only.
- No paywall, subscription gate, trial, or purchase UI for now.
- Audio is deferred. Do not ship Daily Reflection, Speaker Tape, or Big Book
  audio controls until sources, rights, and hosting are decided.
- Big Book keeps native text for content the app may display. Additional
  chapters without text rights will use PDF access, following the 12 & 12
  pattern.
- Meetings currently include Meeting Readings and an external meeting-finder
  deep link. In-app meeting finder, My Meetings, and API-backed meeting features
  are pending.
- Archivo is the structural/title font; Lora is reading/quote text; Inter is UI.
- The Claude design does not define dark mode. The redesign remains light-only
  until a dark palette is intentionally designed; do not derive or invent one.
- Global Text Size applies fully to Inter and Lora. Archivo structural titles
  scale within a narrower range so navigation and hierarchy remain stable.
- No account or login. User data remains local-first.
- Start from shared commit `678aa54`; deliberately exclude divergent commits
  `eb17c97` and `680610b`.

## Completed

### Foundation checkpoint — `d7d97c1`

- Removed the full-app paywall.
- Removed RevenueCat initialization, purchase UI, subscription reset tooling,
  and RevenueCat dependencies.
- Removed the Big Book free/premium split; the full reader opens directly.
- Added `@expo-google-fonts/archivo`.
- Registered Archivo 400/500/600/700 at app startup.
- Added Archivo, Inter, and Lora roles to shared design tokens.
- Verified an iOS production-style Expo export completes.
- Verified the app launches in the iPhone 17 simulator from the Codex worktree.

### Cross-device session skills

- Added repository-scoped `$session-start` and `$session-end` skills under
  `.agents/skills`.
- Startup safely fetches and fast-forwards only clean, non-diverged checkouts,
  then loads the project rules and this handoff.
- Shutdown reviews scope, verifies iOS changes when applicable, updates this
  handoff, commits intended work, and pushes without force.
- Both skill manifests passed YAML/frontmatter validation. The bundled
  `quick_validate.py` could not run because its Python environment lacks
  PyYAML, so equivalent local validation was used.

### Phase 1 — shared app foundation

- Added the warm-white redesign token system for colors, typography, spacing,
  radii, and shadows.
- Added `AppText`, the shared Archivo/Inter/Lora text component.
- Extended the persisted Text Size provider with role-aware global scaling:
  Inter and Lora use the full user scale; Archivo scales conservatively.
- Replaced the stack-only top level with a floating four-tab shell:
  Today, Tools, Journey, Settings.
- Added the persistent AI Sponsor FAB on Today, Tools, and Journey only. It
  opens the last-used sponsor chat from existing AsyncStorage state.
- Added the Journey tab foundation while preserving existing feature routes.
- Removed the legacy Deep Sea theme from active selection and locked the app to
  the approved light palette. Settings marks dark mode as pending design.

## Known baseline issues

- The repository has many pre-existing TypeScript errors unrelated to the
  redesign checkpoint. `npx tsc --noEmit` is not currently a clean project-wide
  gate.
- Use successful iOS bundling plus focused checks for edited files until the
  baseline errors are addressed.
- Metro may warn about `use-latest-callback` package exports; bundling still
  succeeds.
- `expo-av` prints a deprecation warning. Audio work is deferred.

## Next implementation slice

Begin Phase 2 — Today and My Dailies:

1. Add the persisted Morning/Anytime/Evening dailies store and seed contract.
2. Rebuild Today using the approved hero, counter, and action-row system.
3. Keep Daily Reflection permanent and outside the editable list.
4. Build My Dailies add/remove/rename/move/custom-action flows.
5. Connect completion behavior without introducing mock production data.

## Cross-device workflow

Repository skills live in `.agents/skills` and travel with the branch:

- `$session-start` safely fetches/fast-forwards, reads this handoff, and reports
  the exact next task.
- `$session-end` checks the diff, runs focused iOS verification, refreshes this
  handoff, commits the intended work, and pushes the branch.

Codex detects repository skills automatically. If newly pulled skills do not
appear in the picker, restart Codex or start a new thread.

## Session close checklist

Before handing work to another computer or chat:

1. Run focused verification and record the result below.
2. Update Current state, Completed, Known issues, and Next implementation slice.
3. Record any new user decisions under Locked product decisions.
4. Commit code and this file together.
5. Push `codex/3.0-redesign` to GitHub.

## Latest verification

- `npx expo export --platform ios --output-dir .expo/codex-export --clear` — passed
- iPhone 17 simulator launch from Metro port 8082 — passed
- Paywall absent and returning user reaches Home — confirmed from runtime logs
- Phase 1 iOS export after shell/theme/text changes — passed
- iPhone 17 simulator: Today, Journey, and Settings tab states — visually verified
- Sponsor FAB present on Today/Journey and absent on Settings — visually verified
- Settings Lora preview uses global text scaling; light-only appearance shown —
  visually verified
