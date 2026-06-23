# Agent Runbook

## Starting a Task

1. Read `AGENTS.md`.
2. Read `RULES.md`.
3. Read `PERMISSIONS.md`.
4. Read task-specific feature folder.
5. Run `git status`.
6. Create branch.

## Before PR

Run:
```bash
bun scripts/harness-check.mjs
bun run lint:web
cd apps/web && bunx tsc --noEmit
bun run test
bun run build:web
cargo check
cargo test
```

## If Secret Found

1. Stop.
2. Do not print secret.
3. Report path.
4. Ask human to rotate.
