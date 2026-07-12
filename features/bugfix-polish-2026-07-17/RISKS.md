# Risks

## Technical Risks

- Asset preview store now holds `HTMLAudioElement` instances. If `playAudioPreview` is called rapidly, `pause()` on the previous element may race with its `play()` promise, but the browser will resolve to the most recent state.
- `MediaAssetPreview` `src` effect no longer depends on `previewVolume`. A `previewVolumeRef` keeps the latest value for the initial `src` setup; the separate volume effect handles volume-only changes.
- `presets.tsx` `EmptyState` uses `flex-1 min-h-0` to center. If the parent `PanelView` layout changes, this may need re-evaluation.
- `SPLIT_CURSOR` hotspot moved to blade tip `(12, 2)`. This is more accurate but changes the muscle memory from the previous `(16, 16)` scissor hotspot.

## UX Risks

- Audio preview in the assets panel now stops when the user switches to a different media asset or a different sound tab. This is intended behavior, but users may expect a preview to continue while browsing.

## Security Risks

- None. No new dependencies, no auth changes, no secrets.

## Performance Risks

- Moving `audio` state from local component to a global Zustand store adds a tiny amount of cross-component state. The store is not persisted.
- Timeline zoom wheel events are now batched to one `setZoomLevel` per `requestAnimationFrame`. This reduces main-thread contention but may make very fast wheel inputs feel slightly less immediate. If playback still stutters during zoom, the next step is to move the expensive scroll-sync layout into `requestAnimationFrame` or `startTransition`.
- Export `unreachable` for 5-minute video is not yet diagnosed. It likely needs runtime reproduction or a dedicated reproduction script to confirm whether the crash is `initializeGpu`, `request_device`, or a later WGPU failure.

## Mitigations

- Added `stopAudioPreview` calls in `setPreviewAsset` and `clearPreview`.
- Added `pause` of both `audio` and `video` elements in `MediaAssetPreview` before switching asset.
- Minimal UI-only changes for empty state and cursor.
