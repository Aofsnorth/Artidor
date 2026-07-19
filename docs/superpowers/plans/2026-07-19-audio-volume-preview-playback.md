# Audio Volume and Preview Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix stale audio volume visuals, dB suffix overflow, and repeated timeline preview frames.

**Architecture:** Keep existing stores and timeline clock. Repair local controlled-input rendering in `NumberField`; enforce monotonic post-seek frame progression in `VideoCache`.

**Tech Stack:** React 19, TypeScript, Bun 1.3.14, Mediabunny.

## Global Constraints

- No new dependency.
- Preserve dB storage and current preview/commit APIs.
- Preserve unrelated `turbo` and `turbo.json` working-tree changes.
- One focused commit per subsystem.

---

### Task 1: Audio volume visual feedback

**Files:**
- Modify: `apps/web/src/components/ui/number-field.tsx`
- Test: `apps/web/src/components/ui/number-field.test.ts`

- [ ] Add a failing test proving scrub preview controls the displayed input value.
- [ ] Render the clamped scrub preview while pointer scrubbing is active.
- [ ] Reserve suffix width and inset the dB label from the right edge.
- [ ] Run focused tests, lint, and typecheck.
- [ ] Commit the audio UI fix.

### Task 2: Continuous preview frame progression

**Files:**
- Modify: `apps/web/src/services/video-cache/service.ts`
- Test: `apps/web/src/services/video-cache/service.test.ts`

- [ ] Add a failing fake-sink test proving the first forward request after a point seek does not return the sought frame again.
- [ ] Start the forward iterator after the point-seek frame and discard stale prefetched frames.
- [ ] Run focused video-cache and renderer tests.
- [ ] Commit the preview fix.

### Task 3: Integrated verification

- [ ] Run `bun audit`.
- [ ] Run `bun run test`.
- [ ] Run `bun run lint:web`.
- [ ] Run `bun x tsc --noEmit -p apps/web/tsconfig.json`.
- [ ] Run `bun run build:web`.
- [ ] Verify browser behavior if a browser MCP/runtime is available.
- [ ] Push and inspect GitHub Actions.
