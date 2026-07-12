# Plan

## Approach

1. Add a deterministic worker-limit helper that starts from existing CPU/RAM policy then caps concurrent WebGPU compositor workers by output pixel count and GPU availability.
2. Cover cap boundaries with unit tests before changing the parallel export caller.
3. Log chosen policy once per export so Brave users can distinguish GPU contention from encode/decode/audio limits.

## Files to Read First

- `apps/web/src/lib/export/hardware.ts`
- `apps/web/src/services/renderer/parallel-export.ts`
- `apps/web/src/services/renderer/export-worker.ts`

## Files Expected to Change

- `apps/web/src/lib/export/hardware.ts`
- `apps/web/src/lib/export/hardware.test.ts`
- `apps/web/src/services/renderer/parallel-export.ts`
- `apps/web/src/lib/whats-new/feed.ts`
- `apps/web/src/lib/whats-new/__tests__/feed.test.ts`

## Test Plan

- Unit: hardware policy worker caps.
- Integration: existing segment/export-worker tests.
- Manual QA: export 1080p and 4K projects in Brave, inspect `[parallel-export]` logs and throughput.

## Rollback Plan

Revert the policy helper and caller. Existing serial/single-worker fallback remains intact.
