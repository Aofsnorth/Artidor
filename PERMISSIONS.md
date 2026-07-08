# Agent Permissions Policy

## Level 0 — Read Only

Allowed:

- Read files
- Explain code
- Propose plan
- Identify risks
- Suggest tests

Not allowed:

- Edit files
- Run destructive commands
- Create commits

## Level 1 — Safe Edit

Allowed:

- Edit non-sensitive source files
- Add tests
- Update docs
- Run lint/test/build commands

Not allowed:

- Edit secrets
- Edit GitHub workflow/security policy
- Edit auth/payment/license
- Push to main
- Force push
- Delete files broadly

## Level 2 — Sensitive Edit

Requires explicit human approval.

Sensitive paths:

```txt
.github/**
packages/mcp-server/**
apps/web/src/app/api/**
apps/web/src/lib/auth/**
apps/web/src/lib/ai/**
rust/**
Cargo.toml
Cargo.lock
package.json
bun.lock
LICENSE
SECURITY.md
PERMISSIONS.md
```

## Level 3 — Release/Admin

Human only unless explicitly approved:

- Publishing releases
- Rotating secrets
- Changing branch protection
- Deploying production
- Editing organization settings
- Changing license

## Allowed Commands

```bash
git status
git diff
git branch
git checkout -b <branch>
bun install
bun run lint:web
bun run test
bun run build:web
bunx tsc --noEmit
cargo check
cargo test
semgrep scan
gitleaks detect --source .
```

## Dangerous Commands

Never run without explicit approval:

```bash
rm -rf
git push --force
git reset --hard
git clean -fdx
npm publish
cargo publish
curl ... | sh
Invoke-WebRequest ... | iex
chmod -R 777
```

## Git Policy

- Work on feature branches only.
- Main branch is protected.
- Every change goes through PR.
- CI must pass before merge.
- Human review required for sensitive changes.
- No auto-merge by agent.
