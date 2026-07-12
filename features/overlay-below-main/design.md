# Overlay Below Main Track

## Problem
Dragging a video/photo element from the main track downward incorrectly creates a new track *above* the main track because `SceneTracks` only supports `overlay` (above main) and `audio` (below main). Video/photo elements cannot be placed below the main track.

## Goal
Allow visual/video/photo tracks to be placed both above and below the main track, with audio tracks still below all visual tracks.

## Solution
Add `overlayAfter: OverlayTrack[]` to `SceneTracks` and update the display order to:

```
overlay[0..n] → main → overlayAfter[0..m] → audio[0..k]
```

`overlayAfter` is the same track type as `overlay` (video, image, text, graphic, effect, camera). It is simply the visual tracks rendered below the main track.

## Impact Map

### Type layer
- `apps/web/src/lib/timeline/types.ts` — add `overlayAfter` field and `getOrderedTracks` helper.

### Track lookup/update
- `apps/web/src/lib/timeline/track-element-update.ts` — search and update `overlayAfter`.

### Placement logic
- `apps/web/src/lib/timeline/placement/resolve.ts` — use `getOrderedTracks`.
- `apps/web/src/lib/timeline/placement/apply.ts` — insert into `overlayAfter` when `insertIndex` is below main.
- `apps/web/src/lib/timeline/placement/insert-index.ts` — compute `mainTrackIndex` and default/highest indices for `overlayAfter`.

### Drag/drop
- `apps/web/src/components/editor/panels/timeline/drop-target.ts` — use `getOrderedTracks` and resolve below-main targets.
- `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts` — use `getOrderedTracks` in all ordered track lists.
- `apps/web/src/components/editor/panels/timeline/index.tsx` — use `getOrderedTracks` for rendering and track prefix counts.
- `apps/web/src/hooks/timeline/element/use-element-interaction.ts` — use `getOrderedTracks` to find source track.

### Commands
- `apps/web/src/lib/commands/timeline/element/move-elements.ts` — `insertTrackAtDisplayIndex` must map display index to `overlay`, `overlayAfter`, or `audio`.

### Iteration/snap helpers
- `apps/web/src/lib/timeline/element-utils.ts`
- `apps/web/src/lib/timeline/snap-utils.ts`
- `apps/web/src/lib/timeline/use-timeline-playhead.ts`
- `apps/web/src/lib/media/audio.ts`
- `apps/web/src/services/renderer/scene-builder.ts`
- `apps/web/src/core/index.ts`
- `apps/web/src/core/managers/timeline-manager.ts`
- `apps/web/src/core/managers/audio-manager.ts`
- `apps/web/src/hooks/actions/use-editor-actions.ts`
- `apps/web/src/app/projects/page.tsx`
- `apps/web/src/components/editor/project-details-card.tsx`

### Storage
- `apps/web/src/services/storage/migrations/transformers/v24-to-v25.ts` — ensure `overlayAfter` is initialized.
- `apps/web/src/services/storage/service.ts` — preserve `overlayAfter` in `stripAudioBuffers`.

### AI/tools
- `apps/web/src/lib/ai/tools/executor.ts` — include `overlayAfter` in counts and collections.
- `apps/web/src/core/managers/ai-manager.ts` — include `overlayAfter` in summaries.

### Tests
- `apps/web/src/lib/timeline/placement/__tests__/resolve.test.ts`
- `apps/web/src/lib/timeline/element-utils.test.ts`
- `apps/web/src/lib/media/__tests__/audio-silence.test.ts`
- `apps/web/src/components/editor/panels/timeline/__tests__/drop-target.test.ts` if exists

## Risks
- Migrating existing projects without `overlayAfter` array.
- Off-by-one display index math in placement and `move-elements.ts`.
- UI drag/drop hit tests must reflect the new display order.
- Compositing/rendering is unchanged; `overlayAfter` is still a visual track, just displayed below main. The renderer must continue to treat all visual tracks as overlays over the main track unless it already uses the `SceneTracks` display order for z-order.

## Verification
- `bun test resolve.test.ts`
- `bun test drop-target.test.ts` or equivalent
- `cd apps/web && bunx tsc --noEmit`
- `bun run lint:web`
