# Plan — Editor bug fixes and polish (2026-07-17)

## Scope

A batch of small, user-facing fixes and polish items from the current session:

1. **Revert audio meter inverted dB label color** — remove `fillRef`/`fill` threshold logic from `vertical-audio-meter.tsx` and keep labels a single color.
2. **Image drop to main track** — stop forcing image assets to a dedicated overlay track; drop them onto the existing video track instead.
3. **Asset preview kills old preview** — when the user previews a different asset, cancel/stop the previous preview so audio does not overlap.
4. **Center "No preset yet" info** — vertically/horizontally center the empty state in its container.
5. **Cut cursor icon polish** — improve the split-tool cursor SVG and reduce its size.
6. **Keep playback normal while zooming timeline** — ensure audio and video stay in sync when the user widens/narrows the timeline during playback.
7. **Export `unreachable` for 5-minute video** — diagnose and fix the WebAssembly `unreachable` error in the export pipeline.

## Files Expected to Change

- `apps/web/src/components/editor/vertical-audio-meter.tsx` (revert)
- `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts` (image drop)
- `apps/web/src/lib/whats-new/feed.ts` (update)
- `apps/web/src/components/editor/panels/assets/index.tsx` or `asset-preview.ts` (preview lifecycle)
- `apps/web/src/components/editor/panels/assets/preset-card.tsx` or `no-presets.tsx` (`No preset yet` centering)
- `apps/web/src/components/editor/toolbar/split-tool.tsx` or `cursor` CSS (cut cursor)
- `apps/web/src/components/editor/panels/timeline/index.tsx` or `use-timeline-zoom.ts` (zoom during playback)
- `rust/wasm/src/gpu.rs` / `rust/crates/gpu/src/context.rs` (export GPU init — only if details confirm root cause)

## Risks

- Audio meter revert: safe, just removes prop.
- Image drop: may break the old "dedicated image track" behavior; undo and tests must cover.
- Asset preview: must avoid memory/URL leaks for object URLs and `<audio>` elements.
- Cut cursor: CSS-only change, no logic.
- Timeline zoom playback: could cause jank if re-render blocks RAF; needs careful test.
- Export `unreachable`: high risk, root cause unknown. **Blocked until we can reproduce or get the full stack + browser info.**

## Test Plan

- `bun run test` for affected timeline and feed tests.
- `cd apps/web && bunx tsc --noEmit`
- `bun run lint:web`
- Manual QA for asset preview, cursor, and zoom playback.

## Rollback

All changes are small file edits; revert via git and rerun `bun run build:web`.
