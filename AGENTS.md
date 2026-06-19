# Codex repository guidance

Before making changes on the 3.0 redesign:

1. Read `PROJECT_RULES.md`.
2. Read `CODEX_HANDOFF.md`.
3. Treat the latest explicit user instruction as authoritative.
4. Do not change app version/build numbers, identifiers, `eas.json`, or managed
   workflow configuration without explicit permission.
5. Keep the current implementation phase iOS-only unless the user changes scope.
6. Update `CODEX_HANDOFF.md` before ending a meaningful implementation session
   so another Codex chat or computer can continue without transcript access.

## Cross-device session commands

- At the beginning of a new chat or after changing computers, invoke
  `$session-start`.
- At the end of a meaningful work session, invoke `$session-end`.
- The session-end skill is the normal authorized path for focused verification,
  updating the handoff, committing intended changes, and pushing
  `codex/3.0-redesign`.
