# Sober Dailies 3.0 — Codex Handoff

This is the durable handoff between Codex chats and computers. Read this file
before changing code. Update it before ending a meaningful work session, then
commit the update with the related code.

Use `$session-start` when beginning on either computer and `$session-end` before
switching computers or ending a meaningful implementation session.

## Current state

- Branch: `codex/3.0-redesign`
- Starting baseline: `678aa54`
- Latest completed checkpoint: `6d260d6` — Add Supabase Daily Reflection image metadata
- Session workflow checkpoint: `9744028` — Add start and end session skills
- Phase 1 checkpoint: Build shared iOS shell and scalable typography
- Phase 2 status: Today/My Dailies replacement pass is in progress in the
  working tree and not committed yet.
- Current target: iOS only. Android adaptation is a separate phase after iOS is complete.
- Design source package: `Sober Dailies-3.zip` (not committed; supplied separately)
- Latest app-defining prototype: `/Users/nealwagner/Downloads/Sober Dailies - Standalone.html`

## Authority order

When design artifacts disagree, use:

1. The user's latest explicit decision
2. `/Users/nealwagner/Downloads/Sober Dailies - Standalone.html`; if needed,
   inspect the embedded source modules extracted from that standalone bundle
3. `CODEX_HANDOFF.md`
4. `CLAUDE.md` from the design package for data/storage contracts
5. `progress.md` from the design package
6. `DESIGN-DECISIONS.md` from the design package
7. Older canvases and screenshots as historical reference

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
- Daily Reflections hero image should come from an image stored in Supabase,
  not from a final hardcoded/bundled asset. Phase 2 may use a safe fallback
  while wiring the UI, but the data contract should allow Supabase delivery.
- Supabase Storage bucket `daily-reflection-images` now contains the current
  bundled hero image at `daily-reflections/reflection_bg7.webp`.
- Daily Reflection hero-image rotation should use
  `public.daily_reflection_images`, which stores bucket/object paths, active
  status, sort order, alt text, and optional date windows.
- `public.app_image_assets` also exists from the first generic metadata pass,
  but Phase 2 should prefer the dedicated `daily_reflection_images` table.
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
- Added a Supabase migration draft for the Daily Reflections image bucket and
  `app_image_assets` metadata table.
- Created the remote Supabase Storage bucket `daily-reflection-images` and
  uploaded `assets/reflections_images/reflection_bg7.webp` to
  `daily-reflections/reflection_bg7.webp`.
- Applied the remote `app_image_assets` metadata table and then added/applied
  the dedicated `daily_reflection_images` rotation table.
- Verified the app's anon Supabase key can read `daily_reflection_images` and
  resolve the public Storage URL for `reflection_bg7.webp`.

### Phase 2 — Today and My Dailies, replacement pass in progress

- Added local-first `use-dailies-store` backed by AsyncStorage.
- Seeded editable Morning/Anytime/Evening dailies:
  Say my Morning Prayer, Write my Gratitude List, Attend a meeting, Read the
  literature, Nightly Review, and Say my Evening Prayer.
- Rebuilt Today around the standalone prototype Your Day structure: date
  header, medallion sobriety counter, permanent Daily Reflection hero, and
  Morning/Anytime/Evening medallion rows.
- Daily Reflection is permanent and outside the editable dailies list.
- Daily Reflection hero image is fetched from Supabase
  `daily_reflection_images`, with bundled `reflection_bg7.webp` fallback.
- Opening Daily Reflection marks it complete for today; users can still manually
  uncheck it from Today.
- Linked reading/open actions mark complete on open where the prototype does
  so. Writing/review-style actions remain manual until they can sync from their
  save flows.
- Added My Dailies editor screen with add, remove, rename, move-between-section,
  and create-custom-action flows. No drag reorder is implemented, per latest
  decision.
- Added `DailiesProvider` to the app root and registered hidden
  `/(main)/my-dailies` route.
- Corrected the first Today implementation away from the hybrid draft:
  customization moved to the footer `Customize my dailies` affordance, the
  counter returned to medallion style, and standard daily rows now use left
  medallion icons plus right-side completion checks.
- User clarified on June 20, 2026 that the app-defining prototype is
  `/Users/nealwagner/Downloads/Sober Dailies - Standalone.html`, not the older
  intermediate design-path files.

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

Continue Phase 2 — Today and My Dailies:

1. Visually test and tune Today + My Dailies on simulator once the dev-client
   menu is dismissed.
2. Decide whether completion for linked writing tools should be purely manual
   from Today or synced from existing tool stores after save.
3. Connect any agreed existing-tool completion sources without introducing mock
   production data.
4. Continue polish on Today row density, hero height, and My Dailies sheet
   behavior.
5. Resolve the Phase 1/prototype FAB discrepancy: earlier user-approved Phase 1
   has the AI Sponsor FAB on Today/Tools/Journey; the standalone prototype only
   enables it on Tools/Journey.
6. Commit Phase 2 first slice once reviewed.

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
- Supabase Storage bucket `daily-reflection-images` contains
  `daily-reflections/reflection_bg7.webp` — verified by upload response
- Supabase table `daily_reflection_images` has the initial active image row and
  is readable through the app's anon key — verified
- Phase 2 changed-file TypeScript filter — no errors in changed files
- Phase 2 iOS export:
  `npx expo export --platform ios --output-dir .expo/codex-export --clear` —
  passed
- Phase 2 iPhone 17 simulator launch on Metro port 8083 — reached new Today
  screen, loaded Supabase Daily Reflection content, no runtime crash observed
  before dev-client menu overlay
- Phase 2 Today design-guide correction iOS export — passed
- Phase 2 corrected Today screenshot captured at
  `/tmp/sober-dailies-phase2-today-design-pass.png`
- Phase 2 standalone replacement changed-file TypeScript filter — no errors in
  changed files
- Phase 2 standalone replacement iOS export:
  `npx expo export --platform ios --output-dir .expo/codex-export --clear` —
  passed
- Phase 2 standalone replacement Today screenshot captured at
  `/tmp/sober-dailies-phase2-today-standalone-replacement.png`
- Phase 2 prototype/icon fidelity pass added `PrototypeIcon`, aligned Today/My
  Dailies icons to the standalone prototype, removed extra row chevrons,
  changed Daily Reflection hero to title treatment, and switched the Sponsor
  FAB to an avatar image.
- Phase 2 prototype/icon fidelity iOS export:
  `npx expo export --platform ios --output-dir .expo/codex-export --clear` —
  passed
