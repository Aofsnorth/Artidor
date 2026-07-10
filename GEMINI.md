# Gemini / Antigravity Instructions

This repository uses a harness engineering workflow.

Before making any change, read:

1. `AGENTS.md`
2. `RULES.md`
3. `PERMISSIONS.md`
4. `CHECKLIST.md`
5. `SECURITY.md`
6. `HARNESS.md`

Rules:

- Make the smallest safe change.
- Do not rewrite large systems without approval.
- Do not edit secrets or `.env*`.
- Do not change auth, security, MCP, CI, license, or release files without approval.
- Add or update tests for behavior changes.
- Run lint, typecheck, tests, and build when applicable.
- Provide QA notes and rollback plan.