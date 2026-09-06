# Web performance optimization plan

## Goal
Improve `apps/web` export, timeline, editor, and preview performance with the smallest safe changes first. Cross-product rankings require a controlled benchmark and are outside this plan.

## Audit findings (verified by reading code)

### 1. Bundle / initial load
- `apps/web/src/app/editor/[project_id]/page.tsx` previously imported `EffectsView`, `TransitionsView`, `AdjustmentsView`, and `PluginsView` eagerly, even though they are only used inside `FloatingWindow` and `AssetsPanel`.
- `apps/web/src/components/editor/panels/assets/index.tsx` previously imported every asset view eagerly (`StickersView`, `SoundsView`, `FiltersView`, `OverlaysView`, `AnimationsView`, `TemplatesView`, `PresetsView`, `ScriptingView`, `SettingsView`, `AdvancedView`, `QuickToolsView`, etc.) even though only `MediaView` is the default.
- `apps/web/src/components/editor/panels/properties/registry.tsx` previously imported every tab eagerly (`EffectsTab`, `MasksTab`, `AnimationsTab`, `CameraTab`, `SpeedRampTab`, `ParentingTab`, `ImageTab`, `GraphicsStyleTab`, `ElementTab`, `GraphicTab`, `AudioEffectsTab`) even though the inspector only shows one tab at a time.
- `apps/web/src/components/providers/editor-provider.tsx` now imports `CommandPalette` lazily and mounts the lazy boundary only while the palette is open, keeping `cmdk` out of the initial editor request.
- `apps/web/src/components/page-transition.tsx` and `apps/web/src/components/editor/panels/preview/guide-popover.tsx` previously pulled `motion/react` into the editor bundle for small fade/expand animations.
- `apps/web/src/components/env-warning-modal.tsx` still uses `motion/react`, but the root layout now loads the modal through a client-only dynamic boundary that mounts only when required environment configuration is missing.
- `next.config.ts` previously omitted `motion` and `react-icons` from `optimizePackageImports`. `react-icons` remains in use and is not a dead dependency.

### 2. Preview / render loop
- `apps/web/src/components/editor/panels/preview/index.tsx` previously used `useDeepCompareEffect` in `RenderTreeController`. `useEditor` already returns shallow-equal snapshots, so the deep comparison was wasted work per render.
- `PreviewCanvas` previously derived rAF enablement from a ref, allowing the loop to keep running after paused work completed.
- `apps/web/src/services/renderer/compositor/wasm-compositor.ts` `ensureOffscreenCanvas` copies every `ImageBitmap`, `HTMLCanvasElement`, and `HTMLImageElement` source into a new `OffscreenCanvas` before uploading to WASM, even when the Rust side can `copy_external_image_to_texture` directly.
- `rust/crates/gpu/src/context.rs` `import_offscreen_canvas_texture` only accepts `OffscreenCanvas` and has a CPU `get_image_data` fallback for older WebGL paths. Updating it to accept `ExternalImageSource` (`ImageBitmap`, `HTMLCanvasElement`, `OffscreenCanvas`, `HTMLImageElement`) would avoid the JS-side copy.

### 3. Timeline re-renders
- `apps/web/src/components/editor/panels/timeline/index.tsx` already subscribed only to scenes, but `TimelineTrackRows` and `TimelineTrackContent` were not memoized.
- `TimelineTrackContent` previously added a `scroll` listener per track; the parent now observes one shared viewport and passes the visible window to each row.

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

- Phase 1 is complete and verified by lint, typecheck, unit tests, production build, and browser QA recorded in `features/editor-polish-performance-2026-09-06/`.
- Effect preview scheduling now enqueues each job once, lets idle callbacks drain deferred jobs, and avoids a forced GPU-to-CPU pixel readback per visible card.
- Phase 2 remains intentionally deferred. It touches sensitive Rust/WASM GPU paths and needs separate approval, API compatibility research, focused tests, and before/after benchmarks.
- Phase 3 remains future profiling work; no speculative renderer cache was added.
