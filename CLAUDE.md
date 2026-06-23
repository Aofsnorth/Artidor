# Claude Code Instructions

This repository uses a harness engineering workflow.

Before making any change, read and follow:

1. `AGENTS.md`
2. `RULES.md`
3. `PERMISSIONS.md`
4. `CHECKLIST.md`
5. `SECURITY.md`
6. `HARNESS.md`

## Prime Directive

Make the smallest safe change that solves the task.

Do not rewrite large systems, change architecture, edit security-sensitive files, or touch secrets unless explicitly approved.

## Required Workflow

Before coding:

1. Read relevant files.
2. Explain the root cause or goal.
3. Create a minimal plan.
4. Identify risk.
5. Check sensitive paths.

During coding:

1. Touch only necessary files.
2. Keep changes small and reversible.
3. Follow SOLID where applicable.
4. Prefer strong typing.
5. Avoid unnecessary `any`.
6. Avoid silent failures.
7. Avoid hidden business logic inside UI components.
8. Add or update tests when behavior changes.

Before finishing:

1. Run relevant checks.
2. Summarize changed files.
3. Document QA.
4. Explain remaining risks.
5. Provide rollback notes.

## Forbidden Without Approval

- Direct push to `main`
- Force push
- Editing `.env*`
- Committing secrets
- Changing auth, security, MCP, CI, license, or release logic
- Adding dependencies without justification
- Deleting tests to make CI pass
- Large rewrite
- Ignoring failing tests

## Commercial Quality Standard

All code must be:

- production-grade
- maintainable
- secure by default
- bug-resistant
- strongly typed
- easy to review
- ready for real users