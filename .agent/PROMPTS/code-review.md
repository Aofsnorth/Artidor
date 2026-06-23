# Code Review Prompt

Review this change as a senior engineer preparing a commercial release.

Check:

## Code Quality
- SOLID violations
- unnecessary complexity
- duplicated logic
- weak typing
- bad naming
- unclear responsibility
- hidden coupling

## Bug Risk
- unhandled null/undefined
- async race condition
- stale state
- memory leak
- broken undo/redo
- broken persistence
- broken export/render
- edge cases missing

## Security
- secret leakage
- unsafe input handling
- injection risk
- unsafe shell/eval
- auth/API risk
- MCP permission risk
- user privacy risk

## Release Readiness
- tests missing
- QA missing
- rollback unclear
- migration missing
- docs missing

Output:
- Verdict: approve/request changes
- Blockers
- Non-blocking suggestions
- Tests needed
- Security notes
- Harness rule violations