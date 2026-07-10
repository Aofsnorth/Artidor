# Risks: Harness Link Guard

## Risk: false negatives in the extractor

The regex-based extractor may miss some reference styles (e.g. references
inside code fences, or `path` without a recognized extension). Mitigation: the
companion list in AGENTS.md now uses explicit `docs/harness/...` paths that the
extractor reliably catches; the required-files check in the same script still
guarantees the core files exist.

## Risk: over-strict failures on legitimate prose

Narrative filenames (e.g. `app.rs`, `proxy.ts`) could be mis-flagged. Mitigated
by requiring a path separator or `docs/` prefix for backtick references, and by
skipping `<placeholder>` paths.

## Risk: CI job breakage

The new validation runs in the existing `harness` CI job and is additive. If a
future doc edit introduces a broken link, CI fails loudly at PR time (intended
behavior — fail fast, before an agent follows a dead link).

## Rollback

`git revert` the commit. The guard is additive and does not affect product
builds, tests, or runtime.
