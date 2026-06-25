# AI Agent Standard Operating Procedure (Artidor)

> Permanent reminder for AI coding agents working on the Artidor
> repository. Every future session MUST follow this procedure. The
> canonical sources are `AGENTS.md`, `RULES.md`, `PERMISSIONS.md`,
> `CHECKLIST.md`, `docs/harness/DEPENDENCY_POLICY.md`, and
> `docs/harness/DOCUMENTATION_POLICY.md` in the repo root. This file
> is a condensed, action-oriented version for in-session use.

## 1. Prime Directive

**Make the smallest safe change that solves the task.**

Do not rewrite, re-architect, migrate, delete, or rename large areas
unless the user explicitly asks for that exact change.

## 2. Pre-Work Checklist (MANDATORY before any edit)

Read, in this order:

1. `AGENTS.md` — operating manual, prime directive, setup commands.
2. `RULES.md` — 14 core rules + architecture + SOLID + bug prevention
   rules + done definition.
3. `PERMISSIONS.md` — Level 0/1/2/3 permissions, sensitive paths,
   allowed / dangerous commands, Git policy.
4. `CHECKLIST.md` — planning / implementation / quality / docs /
   dependency / commands / roadmap gates.
5. `ROADMAP.md` — confirm the task aligns with current focus
   (stabilization > feature expansion).
6. `docs/harness/DEPENDENCY_POLICY.md` if any dependency is added.
7. `docs/harness/DOCUMENTATION_POLICY.md` if any exported function /
   type / tool / security-sensitive logic is touched.
8. `docs/product/WHATS_NEW_POLICY.md` if the change is user-facing.
9. The actual source files relevant to the task (use `fff` MCP tools,
   not blind `grep`).

If a step is skipped, document why.

## 3. Sensitive Paths (Level 2 — require explicit human approval)

```
.env*                        **/*.pem          **/*.key
**/*secret*                  **/*token*
.github/workflows/**         .github/dependabot.yml
.github/CODEOWNERS
packages/mcp-server/**
apps/web/src/app/api/**
apps/web/src/lib/auth/**
apps/web/src/lib/ai/**
rust/**                      Cargo.toml         Cargo.lock
package.json                 bun.lock
LICENSE                      SECURITY.md        PERMISSIONS.md
```

Never edit these without explicit, on-record user approval in the
session transcript.

## 4. Git Policy (HARD RULES)

- **Never push directly to `main`.** RULES.md #10, PERMISSIONS.md.
- **Always work on a feature branch:** `git checkout -b
  feat/<short-kebab-name>`.
- **Always go through a PR.** CI must pass before merge.
- **Never force-push shared branches.** RULES.md #11.
- **Never merge without CI passing.** RULES.md #12.
- **Never commit secrets / tokens / private credentials.** RULES.md #6.
- **Human review required for sensitive changes.** PERMISSIONS.md Level 3.

If the user asks for a direct push to main, push back. Reference this
SOP.

## 5. Allowed Commands (PERMISSIONS.md)

```bash
git status, git diff, git branch, git checkout -b <branch>
bun install
bun run lint:web
bun run test
bun run build:web
bunx tsc --noEmit          (run inside apps/web)
cargo check, cargo test
semgrep scan
gitleaks detect --source .
```

Never run without explicit approval: `rm -rf`, `git push --force`,
`git reset --hard`, `git clean -fdx`, `npm publish`, `cargo publish`,
`curl ... | sh`, `Invoke-WebRequest ... | iex`, `chmod -R 777`.

## 6. Workflow Per Task

### Before editing

1. Read relevant files (Section 2).
2. Identify the smallest safe change.
3. Confirm scope is small. If not, break into smaller PRs.
4. List risks + rollback plan (RULES.md "Done Definition").
5. Create / update a feature folder under `features/<name>/` for
   non-trivial work using `features/_template/` (FEATURE.md, PLAN.md,
   STATE.md, QA.md, RISKS.md, TODO.md).
6. Create a feature branch:
   ```bash
   git checkout -b feat/<short-kebab-name>
   ```

### During editing

1. Touch only necessary files.
2. Keep changes small and reversible.
3. No new dependency unless explicitly justified
   (`docs/harness/DEPENDENCY_POLICY.md`).
4. No silent `any`, no `@ts-ignore`, no swallowed errors.
5. No `console.log` spam. No TODO without issue/context.
6. Add / update unit tests for any behaviour change.
7. Keep Rust core changes gated behind Level 2 approval.

### After editing

1. Run applicable checks:
   ```bash
   bun run lint:web
   cd apps/web && bunx tsc --noEmit
   bun run test
   bun run build:web
   cargo check
   cargo test
   ```
2. Update feature folder's `QA.md` with the actual commands run and
   their results.
3. Update `STATE.md` (status, last-updated date).
4. List changed files + one-line rationale each.
5. Mention remaining risks honestly in the PR description.
6. Commit with a Conventional Commits subject ≤50 chars + body only
   when "why" is non-obvious.

## 7. Architecture Rules

- React components own **rendering and interaction**, not domain logic.
- Rust (`rust/`) owns **platform-agnostic non-UI logic**:
  timeline math, timebase conversion, compositor logic, GPU/WGPU core,
  mask/effect validation, reusable editor engine behaviour.
- The AI copilot operates through **typed tools**, not free-form
  natural-language commands against the file system.
- MCP server (`packages/mcp-server/`) tools must be:
  typed, least privilege, logged, deny-by-default, protected from
  secrets leakage.

## 8. Quality Gate (every change)

- [ ] Smallest safe change.
- [ ] No unrelated refactor.
- [ ] No new dependency unless justified.
- [ ] No generated / build artefacts edited manually.
- [ ] No `.env*` / secrets touched.
- [ ] No tests weakened or deleted to pass.
- [ ] Errors handled explicitly (no silent `catch`).
- [ ] User privacy preserved.
- [ ] SOLID where applicable.
- [ ] No `any` as escape hatch.
- [ ] No duplicated domain logic.
- [ ] Edge cases handled (null/undefined, empty, large, invalid input,
      async failure, browser compatibility, undo/redo impact,
      persistence impact, export/render impact, security impact).
- [ ] Rollback path documented.

## 9. Documentation Gate (every change)

- [ ] Touched code has useful documentation.
- [ ] Existing undocumented touched code now has minimum documentation.
- [ ] Exported functions / types are documented.
- [ ] AI / MCP tools documented if changed.
- [ ] Security / data behaviour documented if changed.
- [ ] User-facing docs or What's New updated if needed.
- [ ] If docs not updated, reason is explicit.

## 10. What's New Gate (user-facing changes)

Required for: new feature, visible UI change, editor workflow change,
timeline behaviour change, export/render change, AI copilot capability
change, performance improvement visible to users, security/privacy
behaviour change.

Not required for: internal refactor, tests only, CI only, docs only,
non-user-visible cleanup.

If skipped, document the reason in the PR description.

Update `apps/web/src/lib/whats-new/feed.ts` (newest entry first; the
newest entry's `id` drives the unseen indicator).

## 11. Dependency Gate (any new dependency)

Before adding any dependency, framework, crate, SDK, plugin, or
GitHub Action, produce a dependency decision note covering:

1. Purpose — what problem does it solve? Why is existing code insufficient?
2. Project fit — Bun? Next.js? Browser/server? Bundle size?
3. Security — known vulns, install scripts, transitive risk.
4. Maintenance — last release, activity, API stability, docs.
5. License — compatible with Artidor.
6. Alternatives — at least: existing repo solution, current
   installed dependency, proposed dependency, one alternative.
7. Rollback plan — how to remove, what files affected.

Document the decision in the feature folder's `PLAN.md` and reference
the dependency policy file.

## 12. PR Gate

- [ ] Branch is up to date with `main`.
- [ ] PR has summary, files changed, testing evidence, risk + rollback.
- [ ] CI passes (lint, typecheck, test, build, security scans).
- [ ] CODEOWNERS satisfied.
- [ ] Human review done.
- [ ] No auto-merge by agent.

## 13. Done Definition

A change is **not done** until all of:

- [ ] Code is implemented (smallest safe change).
- [ ] Tests are added/updated or skip reason is documented.
- [ ] QA is documented (commands run + results).
- [ ] Security implications are checked.
- [ ] Rollback plan exists for risky changes.
- [ ] Lint + typecheck + tests + build all green.
- [ ] Branch is pushed + PR is open + human review is requested.
- [ ] What's New is updated (or skip reason documented).

If any item is missing, the task is **incomplete**.

## 14. In-Session Reminders

- Use `fff` MCP tools for file search, not blind `grep`/`find`/`glob`.
- Use Context7 for library docs (Next.js, React, etc.) — don't guess.
- Use the smallest tool set that solves the task — no over-tooling.
- Use caveman mode for ultra-compressed output when context is tight
  (the caveman skill is available).
- When the user asks a question that involves multiple steps, surface
  the plan in `todowrite` first.
- When the user asks to "continue" / "lanjut", resume the existing
  todo list — don't restart from zero.
- When uncertain, ask. Do not guess file paths, APIs, or numeric
  thresholds.

## 15. Anti-Patterns (instant fail)

- Pushing directly to `main`.
- Editing `.env*`, secrets, `rust/**`, `Cargo.toml`, `package.json`,
  `bun.lock`, `Cargo.lock`, `LICENSE`, `SECURITY.md`, `.github/**`,
  `packages/mcp-server/**` without explicit approval.
- Adding a dependency to solve a one-liner.
- Deleting tests to make CI pass.
- `// @ts-ignore` / `// eslint-disable-next-line` without justification.
- `try { ... } catch {}` (silent catch).
- `any` as default escape hatch.
- `console.log` left in committed code.
- Skipping `bun run lint:web` / `bunx tsc --noEmit` / `bun run test`.
- Pushing without a PR.
- Describing work as "done" before CI is green.

## 16. Reference: This Session's Workflow

This file was created at the end of the
`feat/snap-external-drop-and-audio-db-fix` session as a permanent
reminder. The actual edits in that session:

1. Read `AGENTS.md`, `RULES.md`, `PERMISSIONS.md`, `CHECKLIST.md`,
   `ROADMAP.md`, plus the relevant source files (`snap-utils.ts`,
   `use-timeline-drag-drop.ts`, `audio-state.ts`, `audio-manager.ts`,
   `media/audio.ts`, `timeline-element.tsx`, `timeline/index.tsx`,
   `timeline-toolbar.tsx`).
2. Created the feature branch.
3. Made 4 changes (snap-to-adjacent, additive dB, replay-mute,
   toolbar scroll) in 6 source files.
4. Added 14 unit tests across 2 new test files.
5. Ran `bun run lint:web`, `bunx tsc --noEmit`, `bun run test` — all
   green.
6. Updated What's New for the most user-visible changes.
7. Created this feature folder with the full SOP traceability.

Follow this template for every future AI session on Artidor.
