# Fase 1 UI Foundation — Native Win32 Desktop 1:1 Visual Parity

> **Status:** Design spec — pending implementation plan.
> **Approach:** Direct2D + DirectWrite for the chrome, keeping the existing D3D12/WGPU viewport child.

## 1. Context

`apps/desktop-native` is the owner-approved native Win32 desktop shell (see `features/desktop-native-win32/` and `ROADMAP.md` approved override 2026-06-27). It already has a functioning editor layout driven by `src/ui/layout.rs` and `src/ui/mod.rs`:

- Header (`src/ui/header.rs`)
- Left vertical tab bar (`src/ui/tab_bar.rs`)
- Tools / Assets panel (`src/ui/assets/mod.rs`)
- Preview panel with D3D12 child viewport (`src/render/`)
- Properties panel (`src/ui/inspector/mod.rs`)
- Timeline (`src/ui/timeline/mod.rs`)
- Footer (`src/ui/footer.rs`)
- Home / Projects screens (`src/ui/welcome.rs`, `src/ui/projects.rs`)

The web app (`apps/web`) is open in the `Artidor` window. Its current editor shows the reference design: dark glassmorphism panels, `backdrop-filter: blur(20px) saturate(180%)`, 12px rounded corners, `Inter` / `Playfair Display` fonts, and a rich panel chrome.

The native app currently renders with GDI (`BeginPaint`, `HDC`, `FillRect`, `DrawText`). It is structurally close to the web layout but visually far from 1:1:

- No glass / blur / rounded corners.
- No custom `Inter` / `Playfair Display` fonts; uses `Segoe UI` at fixed sizes.
- No icons; only text labels.
- Panels are fixed-width; no resizable splitters.
- `tools` panel is filled with a solid red placeholder (`0xFF0000`).
- `Assets` panel only shows a header count and an `Import media (Ctrl+I)` hint, not the web `Library / Stock / Cloud` tabs and `VIDEOS / AUDIO / IMAGES` counts.
- Other panels show placeholder or minimal text.

## 2. Goal

Achieve visual 1:1 parity for the editor chrome and panels in `apps/desktop-native` compared to the currently open web editor.

## 3. Scope

Fase 1 is limited to the **UI chrome and panel rendering**. Backend logic and performance optimization are intentionally deferred to Fase 3.

### 3.1 Renderer Foundation

Replace the main-window GDI `BeginPaint`/`EndPaint` path with a **Direct2D** `ID2D1DeviceContext` + `IDXGISwapChain1`.

- Keep the existing D3D12/WGPU child viewport (`src/render/viewport.rs`). The D2D main window draws the chrome *around* the child HWND.
- The `WM_PAINT` path in `src/main.rs` becomes: `D2dContext::begin_draw`, call `paint_chrome`/home/projects, `D2dContext::end_draw`.
- Resize handling recreates the swap chain buffers and repositions the D3D12 child.
- Use `D2D1_CREATE_DEVICE_CONTEXT_OPTIONS` compatible with `D2D1_DEVICE_CONTEXT_OPTIONS_NONE`.

### 3.2 New `d2d` module

Create `src/d2d/mod.rs` responsible for:

- `D2D1Factory`, `ID2D1Device`, `ID2D1DeviceContext`.
- `IDXGISwapChain1` tied to the main `HWND`.
- `IDWriteFactory` (DirectWrite).
- `IWICImagingFactory2` (for loading PNG/SVG assets if needed).
- Resize + present.
- Cached solid-color brushes, gradient brushes, and effect instances.

### 3.3 New `d2d_gfx` primitives

Create `src/ui/d2d_gfx.rs` with the exact replacements for `src/ui/gfx.rs`:

- `fill_rounded_rect(ctx, rect, color, radius)` — filled rounded rectangle.
- `stroke_rounded_rect(ctx, rect, color, radius, width)` — border.
- `draw_blur_panel(ctx, rect, base_color, blur_radius, border_color, border_top_color, shadow, radius)` — glass panel with Gaussian blur, border, top highlight, and drop shadow.
- `fill_linear_gradient(ctx, rect, color_top, color_bottom)` — vertical gradient.
- `draw_text(ctx, text, rect, format, color, alignment)` — DWrite text layout.
- `draw_icon(ctx, path_or_glyph, rect, color)` — D2D path geometry or text glyph.
- `draw_image(ctx, bitmap, rect, opacity)` — `ID2D1Bitmap` draw.
- `draw_hline`, `draw_vline` helpers.

Color values are `0xRRGGBB` plus an alpha channel. D2D uses `D2D1_COLOR_F` with premultiplied or straight alpha depending on the brush.

### 3.4 Font System

Create `src/ui/font.rs` `DWriteFontCache`:

- Load `Inter` and `Playfair Display` from bundled TTF/OTF files.
- Create `IDWriteTextFormat` for each (size, weight, style).
- Create `IDWriteTextLayout` on demand for measurement and drawing.
- Fallback: `Segoe UI` if custom fonts are missing or fail to load.

Font files to bundle (or download at build time):

- `Inter-VariableFont_opsz,wght.ttf` or static `Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-SemiBold.ttf`, `Inter-Bold.ttf`.
- `PlayfairDisplay-VariableFont_wght.ttf` or static `PlayfairDisplay-Regular.ttf`, `PlayfairDisplay-Italic.ttf`.

### 3.5 Theme Update

Update `src/theme.rs` to use the exact web editor dark tokens derived from `apps/web/src/app/globals.css`:

- `BG` (page background): `#111114` (matches `--background` ≈ hsl(0,0%,6%)).
- `PANEL_BG`: `rgba(15, 15, 18, 0.55)` with `blur(20px) saturate(180%)` and `border-radius: 12px`.
- `PANEL_BORDER`: `rgba(255, 255, 255, 0.06)`.
- `PANEL_BORDER_TOP`: `rgba(255, 255, 255, 0.10)`.
- `PANEL_SHADOW`: `0 24px 80px rgba(0, 0, 0, 0.5)`.
- `TEXT_BRIGHT`: `rgba(255, 255, 255, 0.92)`.
- `TEXT_MUTED`: `rgba(255, 255, 255, 0.64)`.
- `TEXT_DIM`: `rgba(255, 255, 255, 0.55)`.
- `TEXT_FAINT`: `rgba(255, 255, 255, 0.40)`.
- `ACCENT_BG`: `rgba(255, 255, 255, 0.14)`.
- `ACCENT_SUBTLE`: `rgba(255, 255, 255, 0.06)`.
- `BLUE` (primary accent): `#2A3F8C`.
- `CYAN`, `EMERALD`, `AMBER`, dot colors remain.
- `RADIUS_LG`: 12px (`0.82rem`), `RADIUS_MD`: 10px (`0.65rem`), `RADIUS_SM`: 6px (`0.35rem`).

### 3.6 Resizable Panels

Update `src/ui/layout.rs` and `src/window/mod.rs`:

- Add `Splitter` enum: `ToolsPreview`, `PreviewProperties`, `TopTimeline`.
- Store splitter rectangles in `Layout`.
- Store current percentages in `WindowState` (replacing constants `TOOLS_PCT`, `PREVIEW_PCT`, `MAIN_CONTENT_PCT`).
- Clamp percentages to `[0.10, 0.90]` and minimum pixel widths.
- Hit-test splitter drag in `WM_LBUTTONDOWN` / `WM_MOUSEMOVE` / `WM_LBUTTONUP` (`src/window/shortcuts.rs`).
- Draw 3px splitter handles with hover highlight.

### 3.7 Panel Content Parity

Migrate each panel from `gfx.rs` to `d2d_gfx.rs` and add missing chrome.

#### Header (`src/ui/header.rs`)

- Rounded glass bar.
- Brand logo (icon + "Artidor").
- "PROJECTS" identity.
- Zoom capsule.
- Action buttons: Export, Share, Settings, Layout, Cloud.

#### Tab Bar (`src/ui/tab_bar.rs`)

- Vertical 72px rail with rounded hover/active states.
- 17 tool icons + labels.
- Use `Segoe Fluent Icons` or SVG path icons for each tab.

#### Tools / Assets Panel (`src/ui/assets/mod.rs`)

- Remove the red placeholder fill.
- Add `Library` / `Stock` / `Cloud` sub-tabs.
- Add `Import` button.
- Show `VIDEOS 0`, `AUDIO 0`, `IMAGES 0` counters.
- Empty state: "Your creative journey begins here. Import media or drag and drop to get started." with `Import media` button.
- For non-asset tabs, keep placeholder "{Tab} — coming soon" but with proper glass styling.

#### Properties Panel (`src/ui/inspector/mod.rs`)

- Glass panel.
- Sections: `DETAILS`, `PROJECT`, `ACTIVITY`.
- Rows: `Duration`, `Frame rate`, `Resolution`, `Background`, `Created`, `Modified`, `Project ID` with copy button.
- When an element is selected, show transform / compositing properties.

#### Timeline (`src/ui/timeline/mod.rs`)

- Scene switcher (`Add new scene`, `Main scene`, `Manage scenes`).
- Zoom in/out buttons.
- Track header with `Main Track`, hide/mute/lock icons, color picker.
- `Add track` button.
- `Resize track labels column` handle.
- Playhead and ruler.

#### Viewport Toolbar (`src/ui/viewport_toolbar.rs`)

- Glass transport bar at the bottom of the preview panel.
- Timecode `00:00:00:00`.
- Buttons: `Show audio visualizer`, `Go to start`, `Jump backward`, `Play`, `Jump forward`, `Go to end`, `Enable loop playback`, `Freehand draw`, `Vector draw`, `Auto`.
- Use icon glyphs.

#### Footer (`src/ui/footer.rs`)

- Glass status bar.
- Show project status, playback status, and any relevant info.

#### Home / Projects (`src/ui/welcome.rs`, `src/ui/projects.rs`)

- Apply glass panels, rounded corners, correct fonts, and gradients.
- Keep the existing layout and click targets.

### 3.8 Backend / Performance (Fase 3, out of scope here)

Fase 1 does **not** change:

- `rust/crates/compositor`, `gpu`, `effects`, `masks`, `time` logic.
- Export pipeline (`ffmpeg-sidecar`).
- Media decode/encode.
- Project persistence (`serde`/`.artpr.json`).

These will be addressed in a dedicated backend/performance spec.

## 4. Dependencies

Only add `windows` crate features in `apps/desktop-native/Cargo.toml`:

```toml
[dependencies.windows]
features = [
    "Win32_Foundation",
    "Win32_UI_WindowsAndMessaging",
    "Win32_UI_Controls",
    "Win32_UI_Controls_Dialogs",
    "Win32_Graphics_Gdi",
    "Win32_Graphics_Direct2D",
    "Win32_Graphics_Direct2D_Common",
    "Win32_Graphics_DirectWrite",
    "Win32_Graphics_Dxgi",
    "Win32_Graphics_Dxgi_Common",
    "Win32_Graphics_Imaging",
    "Win32_System_LibraryLoader",
    "Win32_UI_Input_KeyboardAndMouse",
]
```

No new external crates. The `windows` crate is already in use.

## 5. File Map

| Responsibility | New/Modify | Path |
|----------------|------------|------|
| D2D factory/context/swap chain | New | `src/d2d/mod.rs` |
| D2D primitive helpers | New | `src/ui/d2d_gfx.rs` |
| DirectWrite font cache | Modify | `src/ui/font.rs` |
| Color/layout constants | Modify | `src/theme.rs` |
| Layout + splitters | Modify | `src/ui/layout.rs` |
| Window state + splitter drag | Modify | `src/window/mod.rs`, `src/window/shortcuts.rs` |
| Main window paint loop | Modify | `src/main.rs` |
| Chrome orchestration | Modify | `src/ui/mod.rs` |
| Home / Projects | Modify | `src/ui/welcome.rs`, `src/ui/projects.rs` |
| Header | Modify | `src/ui/header.rs` |
| Footer | Modify | `src/ui/footer.rs` |
| Tab bar | Modify | `src/ui/tab_bar.rs` |
| Assets panel | Modify | `src/ui/assets/mod.rs` |
| Properties panel | Modify | `src/ui/inspector/mod.rs` |
| Timeline | Modify | `src/ui/timeline/mod.rs` |
| Viewport toolbar | Modify | `src/ui/viewport_toolbar.rs` |
| Dependencies | Modify | `Cargo.toml` |

`src/ui/gfx.rs` can be removed or kept as a legacy GDI fallback if migration is incremental.

## 6. Data Flow

1. `main()` creates the main window and D3D12 viewport child.
2. `main()` initializes `D2dContext` (factory/device/swap chain).
3. `WM_PAINT` calls `D2dContext::begin_draw()` and `paint_chrome()`/`draw_home()`/`draw_projects()`.
4. `paint_chrome()` uses `d2d_gfx` helpers, `DWriteFontCache`, and `theme` constants.
5. `Layout::compute()` returns rectangles including splitter rects.
6. `handle_mousemove()` / `handle_lbuttondown()` / `handle_lbuttonup()` update splitter drag state and `Layout` percentages.
7. `WM_SIZE` resizes the D2D swap chain and repositions the D3D12 child.
8. `D2dContext::end_draw()` presents the frame.

## 7. Verification

- `cargo build --release` in `apps/desktop-native` succeeds.
- `cargo test` in `apps/desktop-native` passes.
- `cargo run` launches the native window.
- After each significant panel migration, use `Windows-MCP` `Snapshot` to capture the native window and compare against the open web editor.
- Screenshot artifacts saved to `C:\Users\Arthenyx\Pictures\Screenshots\Windows-MCP\` for each iteration.
- No changes to `apps/web` or `rust/` crates unless a shared helper is needed.
- No edits to root `Cargo.toml` (the native crate is a standalone workspace by design).

## 8. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Surface area is large (many panels) | Migrate panel-by-panel; `gfx.rs` can coexist as fallback until each panel is converted. |
| Direct2D / DirectWrite API complexity | Use `windows` crate documentation and small standalone prototypes in `src/d2d/` first. |
| Custom font loading may fail on some systems | Fallback to `Segoe UI`; bundle font files as part of the app. |
| D3D12 viewport child may flicker under D2D | Keep the child `HWND` and use `WS_CLIPCHILDREN`; sync position and size on every `WM_SIZE`. |
| Blur effect is expensive at 4K | Cache blurred background bitmap; only recompute on resize or scroll; default blur radius 20px. |

## 9. Rollback Plan

- All changes are isolated to `apps/desktop-native/`.
- The `main` branch is not touched; work on a feature branch.
- Before D2D migration, `main.rs` still supports GDI; we can keep a `GDI` fallback behind a compile-time feature if necessary.
- If D2D proves unstable, revert to the previous GDI state with `git checkout --` of the affected files.

## 10. Success Criteria

- The native editor window, when viewed side-by-side with the web editor, is visually indistinguishable in terms of panel shape, color, blur, rounded corners, fonts, and spacing at the 1920×1080 default size.
- Resizable splitters work and keep a minimum 10% panel width.
- `cargo build` and `cargo test` pass.
- No red placeholder panels remain.
- Header, footer, tab bar, assets, properties, timeline, and viewport toolbar all use the new D2D renderer.

## 11. What's New

Not updated: this is a foundational engineering change, not a user-facing feature or visible workflow change yet. The What's New feed will be updated when the native desktop shell ships to users.

## 12. Notes

- The `Pluggedin` MCP server discovery returned `firecrawl` and `Context7` tools, but live tool calls failed (connection/API key not configured). We will use `Windows-MCP` snapshots for visual verification and built-in web search for reference as needed.
- The backend performance spec (Fase 3) will follow this UI spec. It will focus on hardware decode/encode, zero-copy compositor, and async export to beat web and CapCut performance.
