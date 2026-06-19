---
name: session-end
description: Reliably close a Sober Dailies Codex implementation session for handoff to another chat or computer. Use when the user says end session, wrap up, checkpoint, hand off, commit and push, or prepare work for the other Mac. Review the diff, run proportional iOS verification, update CODEX_HANDOFF.md, commit the intended changes, and push the redesign branch.
---

# End Session

Run this workflow from the Sober Dailies repository checkout.

1. Read `PROJECT_RULES.md`, `AGENTS.md`, and `CODEX_HANDOFF.md`.
2. Confirm branch `codex/3.0-redesign` and its upstream. Stop if another branch
   is active.
3. Inspect `git status`, the full diff, staged changes, and recent commits.
   Preserve unrelated user changes. Do not stage files until their scope is
   understood.
4. Check the changed files for:
   - accidental version/build-number or identifier changes;
   - unauthorized `eas.json`, managed-workflow, or native-project changes;
   - mock design data shipped as production data;
   - unresolved paywall or audio behavior contrary to locked decisions;
   - secrets, generated exports, caches, logs, and temporary files.
5. Run verification proportional to the changes:
   - Always run `git diff --check`.
   - Prefer focused tests or checks for edited code.
   - For app/runtime changes, run an iOS Expo export:
     `npx expo export --platform ios --output-dir .expo/codex-export --clear`.
   - Do not treat the existing project-wide `npx tsc --noEmit` failures as new
     unless edited files add errors. Record baseline limitations honestly.
6. Update `CODEX_HANDOFF.md` before committing:
   - current branch and latest checkpoint;
   - completed work in this session;
   - new explicit product decisions;
   - known issues or blockers;
   - verification commands and results;
   - one concrete next implementation slice.
   Keep it concise and replace stale status rather than appending a diary.
7. Recheck the diff. Stage only the intended files, including
   `CODEX_HANDOFF.md`.
8. Create one clear checkpoint commit. If there are no meaningful changes,
   do not create an empty commit.
9. Push with `git push`. Never force-push.
10. Confirm the local branch matches its upstream and report:
    - commit hash and message;
    - verification result;
    - pushed branch;
    - next task for the new chat.

Ask before committing only when scope is ambiguous, verification reveals a
material failure, or unrelated user changes cannot be separated safely.
Otherwise, the explicit invocation of this skill authorizes the normal
verification, handoff update, commit, and push workflow.

