# Web performance optimization plan

## Goal
Push `apps/web` performance past CapCut in export, timeline, editor, and preview with the smallest safe changes first.

## Audit findings (verified by reading code)

### 1. Bundle / initial load
- `apps/web/src/app/editor/[project_id]/page.tsx` imports `EffectsView`, `TransitionsView`, `AdjustmentsView`, `PluginsView` eagerly, even though they are only used inside `FloatingWindow` and `AssetsPanel`.
- `apps/web/src/components/editor/panels/assets/index.tsx` imports every asset view eagerly (`StickersView`, `SoundsView`, `FiltersView`, `OverlaysView`, `AnimationsView`, `TemplatesView`, `PresetsView`, `ScriptingView`, `SettingsView`, `AdvancedView`, `QuickToolsView`, etc.) even though only `MediaView` is the default.
- `apps/web/src/components/editor/panels/properties/registry.tsx` imports every tab eagerly (`EffectsTab`, `MasksTab`, `AnimationsTab`, `CameraTab`, `SpeedRampTab`, `ParentingTab`, `ImageTab`, `GraphicsStyleTab`, `ElementTab`, `GraphicTab`, `AudioEffectsTab`) even though the inspector only shows one tab at a time.
- `apps/web/src/components/providers/editor-provider.tsx` imports `CommandPalette` eagerly; `CommandPalette` pulls in `cmdk` and is only needed on `Cmd/Ctrl+K`.
- `apps/web/src/components/page-transition.tsx` and `apps/web/src/components/editor/panels/preview/guide-popover.tsx` pull `motion/react` (~480KB) into the editor bundle for small fade/expand animations.
- `apps/web/src/components/env-warning-modal.tsx` is in the root layout and pulls `motion/react` into every route, even though it only renders when env vars are missing.
- `next.config.ts` `optimizePackageImports` does not list `motion` or `react-icons` (the latter is dead but present in `package.json`).

### 2. Preview / render loop
- `apps/web/src/components/editor/panels/preview/index.tsx` uses `useDeepCompareEffect` in `RenderTreeController`. `useEditor` already returns shallow-equal snapshots, so the deep comparison is wasted work per render.
- `PreviewCanvas` `rafEnabled = isPlaying || needsRenderRef.current` relies on a ref, so `useRafLoop` can keep the loop running when paused after a render-tree change (the `needsRenderRef` transition is never re-rendered into `enabled`).
- `apps/web/src/services/renderer/compositor/wasm-compositor.ts` `ensureOffscreenCanvas` copies every `ImageBitmap`, `HTMLCanvasElement`, and `HTMLImageElement` source into a new `OffscreenCanvas` before uploading to WASM, even when the Rust side can `copy_external_image_to_texture` directly.
- `rust/crates/gpu/src/context.rs` `import_offscreen_canvas_texture` only accepts `OffscreenCanvas` and has a CPU `get_image_data` fallback for older WebGL paths. Updating it to accept `ExternalImageSource` (`ImageBitmap`, `HTMLCanvasElement`, `OffscreenCanvas`, `HTMLImageElement`) would avoid the JS-side copy.

### 3. Timeline re-renders
- `apps/web/src/components/editor/panels/timeline/index.tsx` subscribes only to scenes (good), but `TimelineTrackRows` and `TimelineTrackContent` are not `memo`/`PureComponent`. The `Timeline` re-renders on scene changes and drags all visible tracks with it.
- `TimelineTrackContent` adds a `scroll` listener per track; each track updates its own `scrollWindow` state. Moving the listener to the parent and passing `scrollWindow` down would reduce listener count and reconciliation.

### 4. Render-tree resolve
- `apps/web/src/services/renderer/resolve.ts` `resolveRenderTree` runs every frame. `resolveEffectPassGroups` rebuilds effect pass arrays and calls `resolveEffectParamsAtTime` per effect even when effects are not animated. Caching for static nodes/effects is a future win.

## Prioritized implementation plan

### Phase 1: low-risk `apps/web` bundle + runtime (no Rust changes)
1. **Lazy-load asset views** in `components/editor/panels/assets/index.tsx` (keep `MediaView` eager; lazy `TextView`, `StickersView`, `SoundsView`, `EffectsView`, `TransitionsView`, `AdjustmentsView`, `PluginsView`, `FiltersView`, `OverlaysView`, `Captions`, `AnimationsView`, `TemplatesView`, `PresetsView`, `QuickToolsView`, `ScriptingView`, `SettingsView`, `AdvancedView`).
2. **Lazy-load property tabs** in `components/editor/panels/properties/registry.tsx` (keep `TransformTab`, `AudioTab`, `TextTab`, `SpeedTab`, `ImageTab` eager; lazy heavy tabs).
3. **Lazy-load `CommandPalette`** in `components/providers/editor-provider.tsx`.
4. **Lazy-load `EnvWarningModal`** in `app/layout.tsx`.
5. **Replace `PageTransition` and `GridPopover` motion animations with CSS** to remove `motion/react` from the editor and root bundles.
6. **Add `motion` and `react-icons` to `optimizePackageImports`** in `next.config.ts` (safe even if `react-icons` is currently unused; it prevents future accidents).
7. **Replace `useDeepCompareEffect` with `useEffect`** in `PreviewPanel` `RenderTreeController`.
8. **Fix `PreviewCanvas` `rafEnabled` state** so `useRafLoop` truly stops when paused and idle.
9. **Memoize `TimelineTrackRows` and `TimelineTrackContent`** to reduce track re-renders.

### Phase 2: zero-copy GPU upload (Rust changes)
1. **Update `rust/wasm/src/compositor.rs` `upload_texture`** to accept `CanvasImageSource` and parse it into `wgpu::ExternalImageSource`.
2. **Update `rust/crates/gpu/src/context.rs` `import_offscreen_canvas_texture` to `import_external_image`** accepting `wgpu::ExternalImageSource`.
3. **Update `rust/wasm/src/gpu.rs` `import_canvas_texture` and callers** (`effects.rs`, `masks.rs`) to use `ExternalImageSource`.
4. **Remove `ensureOffscreenCanvas` from `wasm-compositor.ts` and `gpu-renderer.ts`** and pass source directly.
5. **Run `cargo check` / `cargo test` and web build**.

### Phase 3: deeper renderer optimizations
1. Cache `resolveEffectPassGroups` for static effects.
2. Move `TimelineTrackContent` scroll listener to `TimelineTrackRows` and pass `scrollWindow`.
3. Profile `resolveRenderTree` and consider Rust-side scene resolution for hot paths.

## Risks
- **Lazy loading** changes chunking; `FloatingWindow` and `AssetsPanel` must still render when a tab is popped out or active. `Suspense` boundaries must be added.
- **Removing `motion` from `PageTransition`/`GridPopover`** changes animation timing slightly. Must preserve CSS-equivalent easing and duration.
- **`PreviewCanvas` rAF loop refactor** is a behavior change. If mishandled, preview could stop updating when paused. `useEffect` for `needsRender` state must be tested.
- **Rust texture upload** touches `gpu/` and `wasm/`. It is a sensitive path because `rust/**` is listed in `PERMISSIONS.md` as L2. We need explicit approval before editing Rust.

## Verification
- `bun run lint:web`
- `cd apps/web && bunx tsc --noEmit`
- `bun run build:web`
- `bun run test`
- `cargo check` (if/when Rust phase is approved)

## Status
Phase 1 planned. Awaiting user direction for Phase 2 (Rust) and then proceeding with Phase 1 `apps/web` changes.
