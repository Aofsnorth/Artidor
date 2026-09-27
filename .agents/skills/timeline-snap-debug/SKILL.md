---
name: timeline-snap-debug
description: Use when timeline magnet/snap behavior is wrong (drop does not snap, drop replaces or hijacks the hovered clip, snap indicator missing) in Artidor drag-and-drop.
---

# Timeline snap debugging

## When to Use

- Magnet enabled but a drop does not snap.
- Dropping media from the library replaces or hijacks an existing clip.
- Snap indicator missing during library/OS-file drops.

## When NOT to Use

- Internal clip re-drag or resize snapping (`use-element-resize` path).
- Playhead auto-aim (`use-timeline-playhead`).

## Procedure

1. Map the drop pipeline: `handleDragOver` (snap + `computeDropTarget`) → `dropTarget` state → `handleDrop` → `execute*Drop` in `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts`.
2. Check `computeDropTarget` (`apps/web/src/components/editor/panels/timeline/drop-target.ts`): it only resolves `targetElement` (hovered clip) when `targetElementTypes` is non-empty. `executeMediaDrop` previously used that target to swap the hovered clip's media — media drops must pass `undefined`.
3. Snap sources: `snapElementEdge` (threshold, `DEFAULT_SNAP_THRESHOLD_PX = 10` at `apps/web/src/lib/timeline/snap-utils.ts`) and `snapToAdjacentClipEdge` (no threshold; cursor already on the clip). Combine as `best = adjacent.snapPoint ? adjacent : edgeSnap`.
4. Reproduce with a throwaway probe test next to the hook: mirror the module mocks (`artidor-wasm`, `@/stores/timeline-store`, `@/hooks/use-editor`, `sonner`, `@/lib/i18n`), `spyOn` `computeDropTarget` to capture `startTimeOverride`, call `dragProps.onDragOver` inside `renderToString`. Delete the probe afterward.
5. Confirm in the real UI: hover a media tile over/next to clip 1, watch the snap indicator, drop, verify a new clip lands adjacent (no media swap).

## Pitfalls

- `SnapResult` vs `SnapPoint`: `adjacent.snapPoint ?? edgeSnap` yields a `SnapPoint`, so `best.snapPoint` and `best.snappedTime` are `undefined` — snap silently disappears. Always pick whole results.
- Terminal collapses bun test output; use `bun test <file> 2>&1 | tr '\r' '\n' | grep -aE "\(fail\)|Expected:|Received:|pass|fail" | uniq`.
- Temporary `console.log` must be removed before finishing (project lint forbids `console`).
- `read_file` may return a stale or compressed view; verify file regions with `sed -n A,Bp <file> > log && read_file log`.

## Verification

- `cd apps/web && bun test src/hooks/timeline src/lib/timeline` — all pass.
- `bunx tsc --noEmit` — exit 0.
- `bunx biome check <changed files>` — clean.
