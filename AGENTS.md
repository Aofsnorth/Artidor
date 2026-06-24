# Agents.md

## Architecture

An ongoing migration is moving all business logic into `rust/`. Each app under `apps/` is a UI shell — it owns rendering, interaction, and platform-specific concerns, but never owns logic. The UI framework for any given app is a replaceable detail.

### `rust/`

The single source of truth for all non-UI code. Everything platform-agnostic belongs here: no components, no hooks, no framework imports.

### `apps/`

Each app is a frontend that calls into Rust. Logic is never duplicated between apps — only UI is, because each platform may use an entirely different framework and language to build it.

- `web/` — Next.js
- `desktop/` — GPUI

## Web

### React

- Read components before using them. They may already apply classes, which affects what you need to pass and how to override them.

### File Search

Use the fff MCP tools for all file search operations instead of default tools.

This file is the operating manual for AI coding agents working on Artidor.

## Prime Directive

Make the smallest safe change that solves the task.

Do not rewrite, re-architect, migrate, delete, or rename large areas unless the user explicitly asks for that exact change.

## Repository Architecture

### `rust/`

The single source of truth for platform-agnostic non-UI logic:
- timeline math
- timebase conversion
- compositor logic
- GPU/WGPU core
- masks/effects logic
- reusable editor engine behavior

### `apps/web/`

Next.js/React frontend:
- UI rendering
- interaction
- editor panels
- routes
- React hooks
- local UI state

Avoid business/domain logic inside React components.

### `packages/mcp-server/`

Sensitive MCP/tooling boundary.

MCP tools must be:
- typed
- least privilege
- logged
- deny-by-default
- protected from secrets leakage

## Setup Commands

Prefer Bun.

```bash
bun install
bun run lint:web
bun run test
bun run build:web
cd apps/web && bunx tsc --noEmit
cargo check
cargo test
```

If a command does not exist, inspect `package.json` before inventing alternatives.

## Required Workflow

Before editing:
1. Read relevant files.
2. Identify smallest safe change.
3. Check `RULES.md`, `PERMISSIONS.md`, and `CHECKLIST.md`.
4. Create/update feature folder for non-trivial work.
5. Explain risks before touching sensitive areas.

During editing:
1. Touch only necessary files.
2. Keep changes small and reversible.
3. Add/update tests for behavior changes.
4. Do not silence TypeScript, Rust, lint, or test errors without justification.

After editing:
1. Run relevant checks.
2. Record QA result.
3. List changed files and why.
4. Mention remaining risks honestly.

## Forbidden Without Explicit Approval

- Direct push to `main`
- Force push
- Deleting tests to make CI pass
- Weakening security rules
- Committing secrets
- Editing `.env*`, private keys, tokens, or credentials
- Changing license/legal text
- Changing auth/payment/security flows
- Adding dependencies without justification
- Large rewrites
- Generated/build output edits
- Disabling CI/security checks
- Ignoring failing tests

## Code Quality Standard

All code must be production-grade, maintainable, secure, and ready for commercial use.

The agent must follow:

- SOLID principles where applicable.
- Small, composable functions.
- Clear separation of concerns.
- Strong typing.
- No unnecessary `any`.
- No hidden business logic inside UI components.
- No duplicate domain logic.
- No large rewrite without explicit approval.
- No fragile workaround unless documented.
- No security shortcut.
- No silent failure.
- No fake success message.

## Professional Code Rules

Before writing code, the agent must ask internally:

1. Is this change minimal?
2. Is this code easy to read?
3. Is this behavior testable?
4. Is this safe for user data?
5. Can this break existing timeline/editor behavior?
6. Does this introduce security risk?
7. Can this be rolled back?

If the answer is risky, the agent must explain the risk before continuing.

## Anti-Bug Rules

For every behavior change:

- Add or update tests when possible.
- Handle edge cases.
- Avoid race conditions.
- Avoid stale state.
- Avoid memory leaks.
- Avoid unhandled promises.
- Avoid unsafe async behavior.
- Avoid mutation of shared state unless intentional.
- Prefer deterministic logic over clever logic.
- Never delete tests to make a problem disappear.

## Security Rules

The agent must treat all user media, project files, API keys, auth tokens, and MCP tools as sensitive.

Never:

- Commit secrets.
- Log secrets.
- Print tokens.
- Store user media remotely unless explicitly designed.
- Add unsafe `eval`, `new Function`, or shell execution.
- Trust user input without validation.
- Expose internal errors to users.
- Change auth, API, MCP, or permission logic without explicit review.

## Dependency and Framework Rules

Before writing new custom code, the agent must check whether the repository already has:

- existing framework support
- existing utility/helper
- existing component/hook
- existing Rust crate/module
- existing package dependency
- standard platform API

The agent must prefer existing frameworks and existing project patterns over writing complex code from scratch.

Before installing any new dependency, framework, crate, SDK, plugin, or GitHub Action, the agent must read and follow:

- `docs/harness/DEPENDENCY_POLICY.md`
- `docs/harness/DEPENDENCY_DECISIONS.md`

The agent must not install dependencies without:

1. explaining why existing code is insufficient
2. comparing alternatives
3. checking security
4. checking license
5. checking maintenance
6. checking bundle/performance impact
7. documenting rollback plan
8. getting approval for high-risk dependencies

If a safe existing framework solves the task, use it.

If a dependency is unnecessary, do not install it.

## Documentation Rules

Before finishing any code change, the agent must read and follow:

- `docs/harness/DOCUMENTATION_POLICY.md`

Every meaningful code change must include documentation.

If the agent edits existing code that has no documentation, the agent must add the minimum useful documentation for the touched area.

Documentation is required for:

- exported functions
- exported types/interfaces
- AI copilot tools
- MCP tools
- timeline logic
- export/render logic
- storage/persistence logic
- Rust core logic
- security-sensitive logic
- complex hooks/components
- user-facing behavior changes

If documentation is not updated, the agent must explicitly explain why.

## Roadmap and What's New Rules

Before implementing any feature, the agent must read:

1. `ROADMAP.md`
2. `docs/product/WHATS_NEW_POLICY.md`
3. `apps/web/src/lib/whats-new/feed.ts` if it exists
4. `apps/web/src/app/changelog/page.tsx` if it exists

The agent must check whether the task is aligned with the roadmap.

For every user-facing change, the agent must update the What's New feed.

User-facing changes include:

- new feature
- visible UI change
- editor workflow change
- timeline behavior change
- export/render behavior change
- AI copilot capability change
- performance improvement visible to users
- security/privacy behavior change

If What's New is not updated, the agent must explicitly write:

"What's New not updated because: <reason>"

The agent must not add features that conflict with `ROADMAP.md` without explicit approval.

## Commercial Readiness Rules

A change is commercial-ready only if:

- It builds successfully.
- It passes typecheck.
- It passes lint.
- It has reasonable tests or manual QA notes.
- It does not leak secrets.
- It does not break existing user projects.
- It has clear rollback path.
- It keeps the product maintainable.

## Sensitive Paths

```txt
.env*
**/*.pem
**/*.key
**/*secret*
**/*token*
.github/workflows/**
.github/dependabot.yml
.github/CODEOWNERS
packages/mcp-server/**
apps/web/src/app/api/**
apps/web/src/lib/auth/**
apps/web/src/lib/ai/**
rust/**
Cargo.toml
package.json
bun.lock
Cargo.lock
LICENSE
```

## Completion Criteria

A task is not complete until:
- The change is minimal.
- The behavior is verified.
- Typecheck/lint/test/build are run or skipped with reason.
- Security-sensitive changes are reviewed.
- Rollback plan exists for risky changes.
