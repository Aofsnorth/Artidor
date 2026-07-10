# Feature: Harness Link Guard & Doc Consistency

## Goal

Make the Artidor harness documentation self-consistent and mechanically
enforced, following industry best practices for agent harness engineering
(OpenAI "harness engineering", Martin Fowler, GitHub Blog, AgentPatterns).

## Why

`AGENTS.md` is the agent's entry point. It pointed at companion files and a
`docs/harness/` directory, but the cross-references were never validated, so
drift was possible (e.g. the root `SECURITY.md` and `docs/harness/security-model.md`
overlap without a clear owner, and `AGENTS.md` re-summarized RULES.md inline
instead of citing it). Best practice (AgentPatterns, WalkingLabs, OpenAI) is:

- `AGENTS.md` is a short router (~100 lines) that *points* to deeper docs,
  never an encyclopedia that paraphrases them.
- Every link from `AGENTS.md` to another file must resolve (CI must fail on
  broken/phantom links).
- Each doc has a single clear owner (no duplicated content across files).

## Changes

1. `AGENTS.md` — trim inline re-summaries of RULES.md/PERMISSIONS.md/CHECKLIST.md;
   make the companion list accurate and explicit about each file's scope,
   including the split between `SECURITY.md` (advisories/audit) and
   `docs/harness/security-model.md` + `threat-model.md` (model/threats).
2. `scripts/harness-check.mjs` — add cross-reference validation: parse every
   `path/to/file.md` and `docs/...` reference in `AGENTS.md`, the root companion
   files, and `docs/harness/README.md`, and fail CI if any target is missing.
3. What's New feed — record the harness hardening entry.

## Scope

- `AGENTS.md` (root)
- `scripts/harness-check.mjs`
- `apps/web/src/lib/whats-new/feed.ts`

## Risk

Low. Documentation + CI guard only. No product code, no sensitive paths.

## References

- AgentPatterns — "AGENTS.md as a Table of Contents, Not an Encyclopedia"
- OpenAI — "Harness engineering: leveraging Codex in an agent-first world"
- Martin Fowler — "Harness engineering for coding agent users"
- GitHub Blog — "How to write a great agents.md"
