# State — Grid Template Card Placement

Status: implemented / awaiting user hand-test

Last updated: 2026-06-22

## Summary
Unified the duplicated inline asset-grid markup into one shared `AssetGrid`
wrapper and wired the previously-stubbed preset templates so they actually
apply to the scene.

## Changes
- New `views/asset-grid.tsx` — shared responsive grid (reads `assetCardSize`,
  consistent `auto-fill` + `gap-2.5`, optional `min` floor).
- Replaced inline grid markup in 8 views: templates, effects, transitions,
  overlays, text, filters, animations, adjustments. Removed their duplicated
  `assetCardSize` reads / store imports.
- Left 3 bespoke grids intentionally unchanged (media `assets.tsx`, `presets.tsx`
  custom min, `stickers.tsx` cap-size) — genuinely different layout needs.
- Wired preset templates: `views/templates.tsx` `applyPresetTemplate()` converts
  `TemplateBuild` (text/graphic/effects, percent coords → center-origin px) via
  the editor's validated builders; removed the `toast.info("not yet wired")` stub.

## Verification
- `bunx tsc --noEmit`: no new errors in touched files.
- All `<AssetGrid>` tags balanced; no stray `gridTemplateColumns` in converted views.
- Lint/build + manual responsive QA (desktop + narrow panel): pending.
