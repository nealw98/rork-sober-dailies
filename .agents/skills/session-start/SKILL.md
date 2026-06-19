---
name: session-start
description: Safely begin a Sober Dailies Codex work session after changing chats or computers. Use when the user says start session, resume work, pick up the redesign, sync the branch, or continue from the handoff. Fetch and fast-forward safely, load project rules and handoff context, inspect repository status, and report the next task without modifying product code.
---

# Start Session

Run this workflow from the Sober Dailies repository checkout.

1. Confirm the repository root, current branch, upstream, worktree status, and
   latest commit.
2. Require branch `codex/3.0-redesign`. If another branch is active, stop and
   explain rather than switching silently.
3. Run `git fetch origin`.
4. Inspect ahead/behind status:
   - If the worktree is dirty, do not pull. Report the changed files.
   - If local and remote have diverged, do not merge, rebase, reset, stash, or
     force anything. Report both unique commit lists.
   - If local is behind and not ahead, run
     `git pull --ff-only origin codex/3.0-redesign`.
   - If local is current or ahead only, leave it unchanged.
5. Read `PROJECT_RULES.md`, `AGENTS.md`, and all of `CODEX_HANDOFF.md`.
6. If the design ZIP is needed for the next task, locate it without extracting
   or committing it. Common location:
   `/Users/nealwagner/Downloads/Sober Dailies-3.zip`.
7. Report:
   - active branch and commit;
   - sync result;
   - dirty/clean status;
   - latest completed checkpoint;
   - locked scope relevant to the next task;
   - recorded verification caveats;
   - exact next implementation slice.
8. Do not edit code as part of this skill. End by stating readiness to begin.

Never run destructive Git commands. Never resolve divergence automatically.
Never change versions, build numbers, identifiers, `eas.json`, package
dependencies, or native workflow configuration during session startup.

