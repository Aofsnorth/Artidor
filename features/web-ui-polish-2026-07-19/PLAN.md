# Web UI Polish — Batch Plan

> Scope: code changes stay inside `apps/web` only. This plan folder is the project-level planning artifact required by `AGENTS.md`.

## Goals

1. Text track defaults to a visible overlay so added text is not hidden behind main video.
2. Color picker saturation/value ring can be dragged.
3. Audible/Muted toggle in the inspector updates immediately when clicked.
4. Inspector primary tab stays highlighted when switching to nested sub-tabs (e.g. Audio → Speed).
5. Second-level inspector tabs share a consistent collapsible card design (like the Audio tab).
6. Reduce preview playback rendering delay / latency.
7. Continue effects catalog work.
8. Commit and push.

## Quick wins (low risk, start first)

- `apps/web/src/lib/timeline/text-track.ts` (or equivalent) — change `addTextTrackWithDefaultText` and `getDefaultInsertIndexForTrack` so text tracks are placed in `overlay` (top) instead of `overlayAfter`.
- `apps/web/src/components/ui/color-picker.tsx` — replace mouse events with pointer events + `setPointerCapture` so dragging the color ring works across the panel.
- `apps/web/src/components/editor/panels/properties/index.tsx` — add a `useEditor` selector with `timeline` subsystem so `InspectorView` re-renders when the selected element is mutated (fixes Audible toggle).
- `apps/web/src/components/editor/panels/properties/index.tsx` — update `PRIMARY_INSPECTOR_TABS` so each primary tab owns the sub-tab IDs for its element type.

## Medium work

- Apply consistent `Section` card styling (`rounded-xl border border-white/[0.08] bg-white/[0.035] shadow-inner shadow-white/[0.02]`) to `ElementTab`, `SpeedTab`, `TextTab`, and other property tabs.

## High risk / needs profiling

- Preview playback latency: tune `PREFETCH_BUFFER_SIZE`, `RenderPerfTracker`, `resolvePreviewRenderScales`, and the `PreviewCanvas` RAF loop. This will be scoped separately after the quick wins land.

## Effects catalog

- Continue previous effects catalog implementation strictly inside `apps/web`.

## Risks

- `PRIMARY_INSPECTOR_TABS` changes can cause the wrong primary tab to highlight if `ownedBy` lists are not exact. Must verify each element type.
- `InspectorView` timeline reactivity may cause extra re-renders during timeline drags; the selector should shallow-compare the selected element reference.
- Preview performance tuning may trade quality for speed; changes should be reversible.
- Color picker pointer capture may break existing keyboard/click interactions; test with mouse and touch.

## Sensitive paths

- `apps/web/src/components/ui/color-picker.tsx` (shared UI component)
- `apps/web/src/components/editor/panels/properties/index.tsx` (inspector routing)
- `apps/web/src/components/editor/panels/properties/tabs/*.tsx` (tab UI)
- `apps/web/src/lib/timeline/*` (timeline/track logic)
- `apps/web/src/core/managers/playback-manager.ts` and `preview-renderer` (preview latency)

## Rollback

- Revert the single commit for quick wins if UI regressions appear.
- Preview performance changes will be committed separately so they can be reverted independently.
