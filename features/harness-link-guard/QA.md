# QA: Harness Link Guard

## Verification performed

1. `bun scripts/harness-check.mjs` — **PASS**
   - All 11 required harness files exist.
   - 22 cross-references across 7 docs validated; all resolve to real files.
2. `bun scripts/whats-new-check.mjs` — **PASS**
   - What's New feed updated for the harness change.

## Negative test (guard actually fails on broken links)

During development the guard was observed failing when AGENTS.md listed
`security-model.md` (relative, non-resolving) instead of
`docs/harness/security-model.md`. After the fix, re-running confirmed the
failure disappeared. The guard is not a false-pass: it catches missing targets.

To re-verify the negative case manually:

```bash
# temporarily add a broken link to AGENTS.md, e.g. `docs/harness/does-not-exist.md`
bun scripts/harness-check.mjs   # expect ❌ Broken cross-reference ... does-not-exist.md
git checkout AGENTS.md          # revert
```

## Edge cases handled by the extractor

- External URLs (`http(s)://`, `mailto:`) and anchors (`#section`) are skipped.
- Bare filenames in prose (`app.rs`, `proxy.ts`, `next.config.ts`) are not
  treated as links (they have no path separator / don't start with `docs/`).
- Template/placeholder paths (`features/<slug>/FEATURE.md`) are skipped.
- Links resolve relative to the *source file's* directory, so `docs/...` from
  a root file and sibling links from a `docs/` file both resolve correctly.

## Changed files

- `AGENTS.md` — companion list rewritten as an accurate router; forbidden list
  trimmed to point at RULES.md/PERMISSIONS.md instead of duplicating them.
- `scripts/harness-check.mjs` — added cross-reference validation.
- `apps/web/src/lib/whats-new/feed.ts` — added improvement entry.
- `features/harness-link-guard/` — FEATURE.md, PLAN.md, QA.md, RISKS.md.
