# Artidor Harness Checklist

## Planning

- [ ] Task is clearly defined.
- [ ] Scope is small enough.
- [ ] Relevant files were read.
- [ ] Risks are listed.
- [ ] Sensitive paths identified.
- [ ] Rollback plan exists for risky change.

## Implementation

- [ ] Change is minimal.
- [ ] No unrelated refactor.
- [ ] No new dependency unless justified.
- [ ] No generated/build files edited manually.
- [ ] No `.env*` or secrets changed.
- [ ] No tests weakened or deleted.
- [ ] Errors handled explicitly.
- [ ] User privacy preserved.

## Professional Quality Gate

- [ ] Code follows SOLID where applicable.
- [ ] Function/module responsibility is clear.
- [ ] No unnecessary `any`.
- [ ] No duplicated domain logic.
- [ ] No silent error handling.
- [ ] Edge cases handled.
- [ ] User data is protected.
- [ ] Security risk checked.
- [ ] Tests added/updated or skip reason documented.
- [ ] Rollback path is clear.
- [ ] Existing behavior is not accidentally changed.
- [ ] Code is maintainable by a human developer.

## Commands

Run applicable checks:

- [ ] `bun run lint:web`
- [ ] `cd apps/web && bunx tsc --noEmit`
- [ ] `bun run test`
- [ ] `bun run build:web`
- [ ] `cargo check`
- [ ] `cargo test`
- [ ] `bunx playwright test`
- [ ] `semgrep scan`
- [ ] `gitleaks detect --source .`

## PR

- [ ] PR has summary.
- [ ] PR lists files changed.
- [ ] PR lists testing evidence.
- [ ] PR lists risk and rollback.
- [ ] CI passes.
- [ ] Security checks pass.
- [ ] Human review done.
- [ ] CODEOWNERS satisfied.
