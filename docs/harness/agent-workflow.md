# Agent Workflow

## Standard Flow

1. Receive task.
2. Classify risk.
3. Read relevant files.
4. Create plan.
5. Create/update feature folder.
6. Implement smallest safe patch.
7. Run checks.
8. Record QA.
9. Open PR.
10. Human review.
11. Merge only after CI passes.

## Risk Classification

Low:

- Docs, comments, small UI copy.

Medium:

- UI behavior, non-sensitive logic, tests.

High:

- Rust core, timeline logic, export, AI tool calls, storage, API routes.

Critical:

- Auth, MCP permissions, secrets, release, CI security, license, payment.
