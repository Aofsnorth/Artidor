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

## Documentation Gate

- [ ] I checked `docs/harness/DOCUMENTATION_POLICY.md`.
- [ ] Touched code has useful documentation.
- [ ] Existing undocumented touched code now has minimum documentation.
- [ ] Exported functions/types are documented.
- [ ] AI/MCP tools are documented if changed.
- [ ] Security/data behavior is documented if changed.
- [ ] User-facing docs or What's New were updated if needed.
- [ ] If docs were not updated, reason is documented.

## Dependency / Framework Gate

- [ ] Existing repo solution was checked.
- [ ] Existing installed dependencies were checked.
- [ ] Standard platform API was considered.
- [ ] New dependency is truly needed.
- [ ] Security risk checked.
- [ ] License checked.
- [ ] Maintenance checked.
- [ ] Bundle/performance impact checked.
- [ ] Transitive dependency risk checked.
- [ ] Alternatives documented.
- [ ] Rollback plan documented.
- [ ] Lockfile changes reviewed.
- [ ] Human approval obtained for high-risk dependency.

## Dependency / Framework Check

- [ ] No new dependency added.
- [ ] New dependency added and documented.
- [ ] Existing framework/code was checked first.
- [ ] Security reviewed.
- [ ] License reviewed.
- [ ] Maintenance reviewed.
- [ ] Bundle/performance impact reviewed.
- [ ] Rollback plan included.

Dependency decision note:

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

## Roadmap / What's New Gate

- [ ] `ROADMAP.md` was checked.
- [ ] Change aligns with roadmap.
- [ ] User-facing impact was evaluated.
- [ ] What's New was updated if needed.
- [ ] If What's New was not updated, reason is documented.
- [ ] Changelog/feed entry is clear for real users.
- [ ] No off-roadmap feature was added without approval.

## PR

- [ ] PR has summary.
- [ ] PR lists files changed.
- [ ] PR lists testing evidence.
- [ ] PR lists risk and rollback.
- [ ] CI passes.
- [ ] Security checks pass.
- [ ] Human review done.
- [ ] CODEOWNERS satisfied.
