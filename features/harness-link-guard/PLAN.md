# Plan: Harness Link Guard

## Impact map

| File | Change | Callers affected |
| ------ | -------- | ------------------ |
| `AGENTS.md` | Rewrite companion list + trim inline summaries | All agents (entry point) |
| `scripts/harness-check.mjs` | Add `validateCrossReferences()` | CI `harness` job |
| `apps/web/src/lib/whats-new/feed.ts` | Add one `security`/`improvement` entry | Changelog UI |

## Steps

1. Read current `AGENTS.md` companion section (lines 9-18) and Sensitive/Forbidden sections.
2. Rewrite the companion list so each entry states its scope unambiguously and
   links all resolve. Remove duplicated inline summary of RULES.md content that
   already lives in RULES.md (cite, don't summarize).
3. Add `validateCrossReferences()` to `scripts/harness-check.mjs`:
   - Extract markdown link targets and bare backtick `path` references.
   - Resolve relative to repo root.
   - Ignore external URLs (http/https) and anchors.
   - Fail if any referenced local file is missing.
4. Run `bun scripts/harness-check.mjs` locally to confirm it passes.
5. Add What's New entry.

## Risks

- None beyond doc/CI. Files being edited are not in the sensitive-path list
  (AGENTS.md / scripts are not listed in PERMISSIONS.md L2 sensitive paths).

## Rollback

- `git revert` the commit; the new CI step is additive and non-destructive.
