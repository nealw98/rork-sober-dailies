# Sober Dailies 3.0 — Codex Handoff

This is the durable handoff between Codex chats and computers. Read this file
before changing code. Update it before ending a meaningful work session, then
commit the update with the related code.

## Current state

- Branch: `codex/3.0-redesign`
- Starting baseline: `678aa54`
- Latest completed checkpoint: `d7d97c1` — Remove paywall and add Archivo foundation
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

Build the shared app foundation used by the redesign:

1. Establish final light/dark palette and typography/component tokens.
2. Replace the current stack-only top-level experience with the four-tab shell:
   Today, Tools, Journey, Settings.
3. Add the persistent AI Sponsor FAB on Today, Tools, and Journey only.
4. Preserve existing feature routes while the individual screens are migrated.
5. Verify the shell in the iOS simulator before beginning Today/My Dailies.

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

