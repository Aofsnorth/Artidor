# D2D Chrome Web-Match Plan

## Goal
Make the D2D editor chrome in `apps/desktop-native/src/ui/d2d_chrome.rs` visually match the web editor chrome while keeping code efficient and preserving `paint_chrome_d2d` / `d2d_paint` signatures.

## Impact Map
- `apps/desktop-native/src/ui/d2d_gfx.rs` — add minimal gradient/radial glow helpers; gradient brushes are cached inside `D2dContext` so they are created once per surface, not per frame.
- `apps/desktop-native/src/d2d/context.rs` — add `header_gradient`, `footer_gradient`, `radial_glow` caches.
- `apps/desktop-native/src/d2d/font.rs` — derive `Clone` for `D2dFontCache` so callers can own font references and avoid borrow conflicts with mutable `D2dGfx` calls.
- `apps/desktop-native/src/ui/d2d_chrome.rs` — rewrite chrome internals (header, footer, preview overlay, assets source tabs, properties details view, timeline toolbar).
- `apps/desktop-native/src/ui/layout.rs` — provides `preview_overlay` and `timeline_toolbar` rects.
- `apps/desktop-native/src/ui/header.rs` / `viewport_toolbar.rs` — keep existing hit-test structs; timeline toolbar fields were added to `ToolbarButtons`.
- `apps/desktop-native/src/theme.rs` — add translucent D2D surface colors (overlay, tabs, chips, cyan soft badge, panel fills).
- `apps/desktop-native/src/ui/mod.rs` — `d2d_paint` now takes `&mut D2dContext` so the chrome can update gradient caches.
- `apps/desktop-native/Cargo.toml` — add `windows-numerics` (transitive dep already used by the `windows` crate) for `Vector2` typed D2D gradient APIs.

## Design Targets
1. **Header** (`editor-header.tsx`):
   - Gradient background `#111114` → transparent + top hairline + radial top glow.
   - Left: circular brand mark, identity pod `Projects / <name>`.
   - Center: zoom capsule.
   - Right: cloud status placeholder, Layout icon button, Settings icon button, Share pill, Export button.
2. **Footer** (`editor-footer.tsx`):
   - Gradient background `#111114` → `#08080a`.
   - Left: "Worked on" timer pill + FPS monitor placeholder.
   - Center: cyan BETA/status pill with emerald dot.
   - Right: metadata `1080p • 30 fps • 16:9 • Stereo`.
3. **Preview overlay** (`preview/index.tsx` ~687):
   - Inside `layout.preview_overlay`: rounded dark glass bar with Fit, aspect ratio, fullscreen, more.
4. **Assets panel** (`assets/views/assets.tsx`):
   - Library / Stock / Cloud source tabs at top when active tab is Assets.
5. **Properties panel** (`properties/details-view.tsx`):
   - "Details" header with "Reset all".
   - ProjectHero placeholder (thumbnail strip, project name, version chip, "View full project info").
   - "Project" section (duration, frame rate, resolution, background).
   - "Activity" section (created, modified, project ID chip).
6. **Timeline toolbar** (`timeline/timeline-toolbar.tsx`):
   - Toolbar strip inside `layout.timeline_toolbar` above ruler.
   - Left: + Add scene button, select/split tool toggle.
   - Center: scene selector placeholder.
   - Right: snapping/ripple placeholders, zoom controls.

## Risks
- D2D gradient brush lifetime/borrow complexity: resolved by moving caches into `D2dContext` and cloning `ID2D1RenderTarget` only during lazy creation.
- Native `Project` model lacks `thumbnail` and `background` fields: use placeholder visuals.
- No real scene/snapping/ripple state: drawn as visual placeholders only; hit-test rects are recorded for future wiring.

## QA
- `cargo check` passes.
- `cargo test` passes (104 tests).
- Manual Windows MCP snapshot shows header gradient/glow, footer timer/FPS/BETA pill, assets source tabs, properties ProjectHero + sections, preview overlay controls, and timeline toolbar.
- Preview area remains dark because WGPU surface presentation still fails outside Phase 1; the child window fallback clear prevents parent UI bleed.

## Rollback
Revert the edited `apps/desktop-native` files and remove `windows-numerics` from `Cargo.toml`; `paint_chrome_d2d` signature is preserved so rollback is isolated.
