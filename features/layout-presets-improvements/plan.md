# Layout presets improvements

## Goal
Make the editor header layout-presets dropdown more useful: functional, with
visual previews, pro-scope labels, and a richer set that still includes
compact.

## Current state
- `usePanelStore` holds `LAYOUT_PRESETS`: Default, Compact, Color Grading,
  Effects Focus, Audio Mix, Fullscreen Preview.
- The dropdown in `editor-header.tsx` shows only text names.
- There is no notion of pro/free scope on presets.

## Plan
1. Extend `LayoutPreset` in `panel-store.ts` with optional `scope: "free" | "pro"`
   (default `"free"`). Keep `compact` untouched.
2. Add two new presets that are useful and distinct:
   - `minimal-tools`: very narrow left tools panel for small screens.
   - `timeline-focus`: large bottom timeline for editing timing.
3. Mark a couple of specialized presets as `"pro"` (Color Grading, Effects Focus)
   so the UI can surface a Pro badge.
4. Build a tiny inline `LayoutPresetPreview` SVG component in
   `editor-header.tsx` that draws a schematic of the 5 panels (left tools,
   center preview, right properties, bottom timeline).
5. Update `LayoutPresetsDropdown` to show the preview icon, the name, and a
   Pro badge when `scope === "pro"`.
6. Update `LAYOUT_PRESETS` usage so any caller still gets the same preset
   objects; the change is additive.

## Files to touch
- `apps/web/src/stores/panel-store.ts`
- `apps/web/src/components/editor/editor-header.tsx`

## Risks
- No real subscription state exists yet, so the Pro badge is visual only.
  Selecting a pro preset is not blocked; that would require an auth/sub
  hook which is out of scope.
- Adding scope may need i18n keys for "Pro" label. `dictionaries.ts` already
  contains a "Pro" string for effects; reuse a generic approach.

## Sensors
- `cd apps/web && bunx tsc --noEmit`
- `bun run lint:web`
- `bun test apps/web/src`
