# Agents.md

This file is the operating manual for AI coding agents working on Artidor.

It is the **feedforward** layer of the Artidor harness: it steers the agent
before it acts. The **feedback** layer (sensors that let the agent self-correct
after it acts) is described in [Sensors](#sensors-feedback) below.

Companion files are the canonical source for the rules summarized here. This
file is a **router**: it points to those files, it does not re-state their
contents (cite, don't summarize — paraphrased rules drift out of date the
moment the source changes). Read the linked file when a task touches that area.

- `RULES.md` — engineering rules (humans + agents). The single source of truth
  for core/production/architecture/bug-prevention rules.
- `PERMISSIONS.md` — what an agent may do at each trust level (L0–L3), allowed
  vs dangerous commands, git policy.
- `CHECKLIST.md` — per-task completion gate (planning → implementation →
  quality → docs → dependency → commands → roadmap → PR).
- `HARNESS.md` — harness component map and maturity target (H5/H7).
- `SECURITY.md` — **security advisories & audit log** (secret handling, known
  dependency advisories, full security audit findings). Owner of "what we found
  and accepted".
- `docs/harness/` — **policies** (the *current required controls*):
  - `docs/harness/security-model.md` — required security controls (Gitleaks, Semgrep, etc.)
  - `docs/harness/threat-model.md` — enumerated threats T1–T7 and their defenses
  - `docs/harness/agent-workflow.md` — standard 11-step flow + risk classification
  - `docs/harness/testing-strategy.md`, `docs/harness/mcp-policy.md`,
    `docs/harness/release-and-rollback.md`, `docs/harness/metrics.md`,
    `docs/harness/DOCUMENTATION_POLICY.md`, `docs/harness/DEPENDENCY_POLICY.md`,
    `docs/harness/DEPENDENCY_DECISIONS.md`

When this file and a companion disagree, the companion is canonical. If you
find a disagreement, fix one of them rather than working around it. The
`harness` CI job (`scripts/harness-check.mjs`) validates that every link above
resolves to a real file, so a broken reference fails CI before it reaches an
agent.

## Harness Model

A coding agent is `Model + Harness`. The harness is everything around the
model that makes its work safe, repeatable, testable, and reviewable. Artidor's
harness has two control kinds, each with a computational and an inferential
form:

- **Guides (feedforward)** — steer the agent *before* it acts. This file,
  `RULES.md`, skills, ref docs, and the architecture rules below are guides.
  They raise the probability that the first attempt is correct.
- **Sensors (feedback)** — observe *after* the agent acts and let it
  self-correct. Lint, typecheck, tests, build, Semgrep, Gitleaks are sensors.
  A sensor is most useful when its output is LLM-consumable: an error message
  that says *how to fix* the violation, not just that one occurred.

Both are required. Guides without sensors encode rules that are never checked;
sensors without guides repeat the same mistakes. Every rule below should trace
to a real agent failure — if it does not, it does not belong here.

## Prime Directive

Make the smallest safe change that solves the task.

Do not rewrite, re-architect, migrate, delete, or rename large areas unless the
user explicitly asks for that exact change.

## Repository Architecture

An ongoing migration is moving all business logic into `rust/`. Each app under
`apps/` is a UI shell — it owns rendering, interaction, and platform-specific
concerns, but never owns logic. The UI framework for any given app is a
replaceable detail. Logic is never duplicated between apps — only UI is,
because each platform may use an entirely different framework and language.

### `rust/`

The single source of truth for platform-agnostic non-UI logic:
- timeline math
- timebase conversion
- compositor logic
- GPU/WGPU core
- masks/effects logic
- reusable editor engine behavior

No components, no hooks, no framework imports belong here. Editing `rust/` is
allowed with normal review (it is not a sensitive path); the migration of
logic into `rust/` is expected to be agent-driven.

### `apps/web/`

Next.js/React frontend:
- UI rendering
- interaction
- editor panels
- routes
- React hooks
- local UI state

Avoid business/domain logic inside React components.

### `apps/desktop-web/`

The desktop app uses Tauri 2.0 as a native shell. The web frontend
(Next.js/React) runs unchanged in the system WebView. Native Rust commands
(in `src-tauri/`) expose the WGPU compositor and native file I/O to the
frontend via Tauri IPC.

- `apps/desktop-web/src-tauri/` — Tauri Rust backend (commands, config)
- `apps/web/src/lib/tauri/` — Tauri detection + IPC bridge (web side)

The old GPUI code (`apps/desktop-web/src/ui/`, `app.rs`, etc.) is being phased
out. It still compiles but is not the active desktop path.

### `packages/mcp-server/`

Sensitive MCP/tooling boundary.

MCP tools must be:
- typed
- least privilege
- logged
- deny-by-default
- protected from secrets leakage

## Web

### React

- Read components before using them. They may already apply classes, which
  affects what you need to pass and how to override them.

### File Search

Use the `filesystem` MCP server for file search operations. Other available
MCP servers: `context7` (library docs), `github-mcp-server`, `ponytail`,
`exa-code`, `computer-control-mcp`. Do not reference MCP servers that are not
configured.

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

If a command does not exist, inspect `package.json` before inventing
alternatives.

## Required Workflow

The workflow has three phases with a hard gate between planning and execution.
The gate is the cheapest moment to catch a wrong assumption.

### 1. Before editing (plan)

1. **Read real code first.** Do not plan from the task text alone. Open the
   files the task will touch and trace the symbols they call and that call
   them. Build a small **impact map**: which files change, which callers are
   affected, which tests cover them.
2. Identify the smallest safe change.
3. Check `RULES.md`, `PERMISSIONS.md`, and `CHECKLIST.md`.
4. Create/update a feature folder (`features/<slug>/`) for non-trivial work.
5. List risks and sensitive paths the change crosses.
6. **Show the plan before touching files.** Present the impact map, the
   intended change, and the risks. Wait for direction on anything ambiguous
   or high-risk before implementing.

### 2. During editing (execute)

1. Touch only the files the plan identified. If the impact map grows, stop and
   revise the plan rather than silently expanding scope.
2. Keep changes small and reversible.
3. Add/update tests for behavior changes.
4. Do not silence TypeScript, Rust, lint, or test errors without
   justification. If a sensor fires, treat its message as a remediation
   instruction and fix the root cause.

### 3. After editing (verify)

1. Run the relevant [Sensors](#sensors-feedback).
2. Record the QA result.
3. List changed files and why.
4. Mention remaining risks honestly.
5. Confirm the What's New and documentation gates (below) are satisfied.

## Sensors (Feedback)

Run the sensors that apply to the change. Treat any failure as a
self-correction signal, not a blocker to suppress.

- `bun run lint:web` — web lint
- `cd apps/web && bunx tsc --noEmit` — web typecheck
- `bun run test` — unit/integration tests
- `bun run build:web` — web build
- `bunx playwright test` — e2e (when UI behavior changed)
- `cargo check` — Rust compile
- `cargo test` — Rust tests
- `semgrep scan` — static security analysis
- `gitleaks detect --source .` — secret detection

When a sensor's output is not actionable on its own, improve the sensor (e.g.
add a lint rule with a remediation message) rather than relying on the agent
to re-derive the fix each time.

## Forbidden Without Explicit Approval

The authoritative list of forbidden actions lives in `RULES.md` (Core Rules)
and `PERMISSIONS.md` (L2/L3 sensitive paths). The most common ones:

- Direct push to `main` / force push
- Deleting or weakening tests to make CI pass
- Committing secrets, or editing `.env*`, private keys, tokens, credentials
- Weakening security rules or changing auth/payment/security flows
- Changing license/legal text without approval
- Adding dependencies without the justification in `docs/harness/DEPENDENCY_POLICY.md`

When in doubt, the companion files are canonical — read them, do not guess.
Also forbidden without approval: large rewrites, editing generated/build output,
disabling CI/security checks, and ignoring failing tests.

## Code Quality Standard

All code must be production-grade, maintainable, secure, and ready for
commercial use.

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

The agent must treat all user media, project files, API keys, auth tokens, and
MCP tools as sensitive.

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

Before writing new custom code, the agent must check whether the repository
already has:

- existing framework support
- existing utility/helper
- existing component/hook
- existing Rust crate/module
- existing package dependency
- standard platform API

The agent must prefer existing frameworks and existing project patterns over
writing complex code from scratch.

Before installing any new dependency, framework, crate, SDK, plugin, or GitHub
Action, the agent must read and follow:

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

If the agent edits existing code that has no documentation, the agent must add
the minimum useful documentation for the touched area.

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

The agent must not add features that conflict with `ROADMAP.md` without
explicit approval.

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
Cargo.toml
package.json
bun.lock
Cargo.lock
LICENSE
```

`rust/**` is intentionally **not** listed: editing Rust core logic is allowed
with normal review, because the ongoing migration moves business logic into
`rust/` and is expected to be agent-driven. Treat Rust core logic with the
same care as any production code — add tests, run `cargo check` and
`cargo test` — but no special approval is required beyond standard review.

## Completion Criteria

A task is not complete until:
- The change is minimal.
- The behavior is verified by the relevant sensors.
- Typecheck/lint/test/build are run or skipped with a stated reason.
- Security-sensitive changes are reviewed.
- Rollback plan exists for risky changes.
- Documentation and What's New gates are satisfied or skipped with a reason.
