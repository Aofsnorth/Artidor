# Fase 1 UI Foundation — Direct2D/DirectWrite Implementation Plan

> **Status:** Implementation plan — ready for implementation.  
> **Spec:** `docs/superpowers/specs/2026-07-10-desktop-native-fase1-ui-d2d.md`  
> **Scope:** UI chrome and panel rendering in `apps/desktop-native`; no backend/compositor changes.  
> **Approach:** Incremental panel-by-panel migration, GDI-to-D2D swap-out, DirectWrite fonts, resizable splitters.

## 1. Goal & Success Criteria

Replace the main-window GDI paint path with Direct2D/DirectWrite and reach visual 1:1 parity with the web editor for the native Win32 shell.

Done when:

- `cargo build` and `cargo test` pass in `apps/desktop-native`.
- `cargo run` shows the native editor with the web-matched dark glass theme, rounded panels, `Inter`/`Playfair Display` fonts, and resizable splitters.
- No red placeholder panels remain.
- Home/Projects, header, footer, tab bar, assets, inspector, timeline, and viewport toolbar all render through the new D2D path.
- Side-by-side screenshots at 1920×1080 match the open web editor.

## 2. Constraints

- Only the `windows` crate features listed in this plan may be added; **no external crates**.
- The D3D12/WGPU viewport child (`src/render/`) stays untouched.
- Changes are isolated to `apps/desktop-native`; no edits to `apps/web`, `rust/`, root `Cargo.toml`, or CI.
- `Win32_Graphics_Direct2D_Common` is explicitly enabled because all D2D geometry types (`D2D1_COLOR_F`, `D2D_RECT_F`, `D2D1_ROUNDED_RECT`, `D2D1_PIXEL_FORMAT`) live there.
- `DrawText` is used with `IDWriteTextFormat` (it does **not** require `windows_numerics` or `windows_window`); `DrawTextLayout` is only introduced later if glyph-level measurement is needed.
- The `IDXGISwapChain1` device context path requires a D3D11 device, so `Win32_Graphics_Direct3D` and `Win32_Graphics_Direct3D11` are required.
- `IWICImagingFactory` is **not** part of the core D2D setup; if image loading is added later, `Win32_Graphics_Imaging` and `Win32_System_Com` will be added.

## 3. Dependencies

Apply this to `apps/desktop-native/Cargo.toml`:

```toml
[dependencies.windows]
version = "0.62.2"
features = [
    "Win32_Foundation",
    "Win32_UI_WindowsAndMessaging",
    "Win32_UI_Controls",
    "Win32_UI_Controls_Dialogs",
    "Win32_UI_Input_KeyboardAndMouse",
    "Win32_Graphics_Gdi",
    "Win32_Graphics_Direct2D",
    "Win32_Graphics_Direct2D_Common",
    "Win32_Graphics_DirectWrite",
    "Win32_Graphics_Direct3D",
    "Win32_Graphics_Direct3D11",
    "Win32_Graphics_Dxgi",
    "Win32_Graphics_Dxgi_Common",
    "Win32_System_LibraryLoader",
]
```

> Optional: Add `Win32_Graphics_Imaging` and `Win32_System_Com` only if the `IWICImagingFactory` path for PNG/SVG assets is implemented later.

## 4. File Map

| New / Modify | Path | Responsibility |
|--------------|------|----------------|
| New | `src/d2d/mod.rs` | D2D/DXGI/DWrite factories, device, swap chain, back-buffer target, brush cache |
| New | `src/ui/d2d_gfx.rs` | Primitive D2D helpers (rect, rounded rect, gradient, text, blur panel) |
| Modify | `src/ui/font.rs` | `DWriteFontCache` with `Inter`/`Playfair Display` + `Segoe UI` fallback |
| Modify | `src/theme.rs` | Web-exact dark glass tokens and rounded radius constants |
| Modify | `src/ui/layout.rs` | Splitter rectangles and percentage-based layout |
| Modify | `src/window/mod.rs`, `src/window/shortcuts.rs` | Splitter drag state and hit-testing |
| Modify | `src/main.rs` | `WM_PAINT` calls `D2dContext`; `WM_SIZE` resizes swap chain and child |
| Modify | `src/ui/mod.rs` | Chrome orchestration using `d2d_gfx` |
| Modify | `src/ui/welcome.rs`, `src/ui/projects.rs` | Glass-styled home and project hub |
| Modify | `src/ui/header.rs`, `src/ui/footer.rs`, `src/ui/tab_bar.rs` | Rounded glass bars and icon/text labels |
| Modify | `src/ui/assets/mod.rs` | Library/Stock/Cloud tabs and empty state |
| Modify | `src/ui/inspector/mod.rs` | Glass property rows with copy buttons |
| Modify | `src/ui/timeline/mod.rs` | Track header, scene switcher, playhead/ruler |
| Modify | `src/ui/viewport_toolbar.rs` | Glass transport bar with timecode and icon glyphs |
| Remove or gate | `src/ui/gfx.rs` | Keep as `#[cfg(feature = "gdi-fallback")]` until D2D migration is complete |

## 5. Task Breakdown

### Task 1 — D2D renderer foundation (`src/d2d/mod.rs`)

Create a `D2dContext` struct that owns the full D2D/DXGI/DWrite stack. The struct must keep the D3D11 device and DXGI device alive because the swap chain and D2D device context depend on them.

```rust
use std::collections::HashMap;
use std::mem::ManuallyDrop;
use std::ptr::null_mut;

use windows::core::{PCWSTR, Result};
use windows::Win32::Foundation::{HWND, HMODULE, E_FAIL};
use windows::Win32::Graphics::Direct2D::{
    D2D1CreateDevice,
    Common::{D2D1_ALPHA_MODE_PREMULTIPLIED, D2D1_BITMAP_OPTIONS_TARGET, D2D1_COLOR_F, D2D1_PIXEL_FORMAT},
    D2D1_BITMAP_PROPERTIES1, D2D1_DEVICE_CONTEXT_OPTIONS_NONE, ID2D1Bitmap1,
    ID2D1Device, ID2D1DeviceContext, ID2D1SolidColorBrush,
};
use windows::Win32::Graphics::Direct3D::{D3D_DRIVER_TYPE_HARDWARE, D3D_FEATURE_LEVEL_11_0};
use windows::Win32::Graphics::Direct3D11::{
    D3D11CreateDevice, D3D11_CREATE_DEVICE_BGRA_SUPPORT, D3D11_SDK_VERSION, ID3D11Device,
};
use windows::Win32::Graphics::DirectWrite::{
    DWriteCreateFactory, DWRITE_FACTORY_TYPE_SHARED, IDWriteFactory, IDWriteTextFormat,
};
use windows::Win32::Graphics::Dxgi::{
    CreateDXGIFactory1, Common::{DXGI_ALPHA_MODE_IGNORE, DXGI_FORMAT_B8G8R8A8_UNORM, DXGI_SAMPLE_DESC},
    DXGI_SCALING_STRETCH, DXGI_SWAP_CHAIN_DESC1, DXGI_SWAP_CHAIN_FLAG, DXGI_SWAP_EFFECT_FLIP_DISCARD,
    DXGI_USAGE_RENDER_TARGET_OUTPUT, DXGI_PRESENT, IDXGIFactory2, IDXGISurface2, IDXGISwapChain1,
};

pub struct D2dContext {
    pub d2d_context: ID2D1DeviceContext,
    pub swap_chain: IDXGISwapChain1,
    pub dwrite: IDWriteFactory,
    pub d2d_device: ID2D1Device,
    pub dxgi_device: IDXGIDevice,
    pub d3d_device: ID3D11Device,
    target: Option<ID2D1Bitmap1>,
    hwnd: HWND,
    width: u32,
    height: u32,
    brushes: HashMap<u32, ID2D1SolidColorBrush>,
}

impl D2dContext {
    pub unsafe fn new(hwnd: HWND, width: u32, height: u32) -> Result<Self> {
        let mut d3d_opt: Option<ID3D11Device> = None;
        D3D11CreateDevice(
            None::<&windows::Win32::Graphics::Dxgi::IDXGIAdapter>,
            D3D_DRIVER_TYPE_HARDWARE,
            HMODULE(null_mut()),
            D3D11_CREATE_DEVICE_BGRA_SUPPORT,
            Some(&[D3D_FEATURE_LEVEL_11_0]),
            D3D11_SDK_VERSION,
            Some(&mut d3d_opt),
            None,
            None,
        )?;
        let d3d_device = d3d_opt.ok_or_else(|| windows::core::Error::from_hresult(E_FAIL))?;

        let dxgi_device: IDXGIDevice = d3d_device.cast()?;
        let d2d_device: ID2D1Device = D2D1CreateDevice(&dxgi_device, None)?;
        let d2d_context: ID2D1DeviceContext =
            d2d_device.CreateDeviceContext(D2D1_DEVICE_CONTEXT_OPTIONS_NONE)?;

        let dxgi_factory: IDXGIFactory2 = CreateDXGIFactory1()?;

        let desc = DXGI_SWAP_CHAIN_DESC1 {
            Width: width,
            Height: height,
            Format: DXGI_FORMAT_B8G8R8A8_UNORM,
            Stereo: 0,
            SampleDesc: DXGI_SAMPLE_DESC { Count: 1, Quality: 0 },
            BufferUsage: DXGI_USAGE_RENDER_TARGET_OUTPUT,
            BufferCount: 2,
            Scaling: DXGI_SCALING_STRETCH,
            SwapEffect: DXGI_SWAP_EFFECT_FLIP_DISCARD,
            AlphaMode: DXGI_ALPHA_MODE_IGNORE,
            Flags: 0,
        };

        let swap_chain: IDXGISwapChain1 =
            dxgi_factory.CreateSwapChainForHwnd(&d3d_device, hwnd, &desc, None, None)?;

        let dwrite: IDWriteFactory = DWriteCreateFactory::<IDWriteFactory>(DWRITE_FACTORY_TYPE_SHARED)?;

        let mut ctx = Self {
            d2d_context,
            swap_chain,
            dwrite,
            d2d_device,
            dxgi_device,
            d3d_device,
            target: None,
            hwnd,
            width,
            height,
            brushes: HashMap::new(),
        };
        ctx.bind_target()?;
        Ok(ctx)
    }

    unsafe fn bind_target(&mut self) -> Result<()> {
        self.d2d_context.SetTarget(None);
        let back_buffer: IDXGISurface2 = self.swap_chain.GetBuffer(0)?;
        let props = D2D1_BITMAP_PROPERTIES1 {
            pixelFormat: D2D1_PIXEL_FORMAT {
                format: DXGI_FORMAT_B8G8R8A8_UNORM,
                alphaMode: D2D1_ALPHA_MODE_PREMULTIPLIED,
            },
            dpiX: 96.0,
            dpiY: 96.0,
            bitmapOptions: D2D1_BITMAP_OPTIONS_TARGET,
            colorContext: ManuallyDrop::new(None),
        };
        let bitmap: ID2D1Bitmap1 =
            self.d2d_context.CreateBitmapFromDxgiSurface(&back_buffer, Some(&props))?;
        self.d2d_context.SetTarget(&bitmap);
        self.target = Some(bitmap);
        Ok(())
    }

    pub unsafe fn begin_draw(&self) {
        self.d2d_context.BeginDraw();
    }

    pub unsafe fn end_draw(&self) -> Result<()> {
        self.d2d_context.EndDraw(None, None)?;
        self.swap_chain.Present(1, DXGI_PRESENT(0)).ok()?;
        Ok(())
    }

    pub unsafe fn clear(&self, color: &D2D1_COLOR_F) -> Result<()> {
        self.d2d_context.Clear(Some(color));
        Ok(())
    }

    pub unsafe fn resize(&mut self, width: u32, height: u32) -> Result<()> {
        self.d2d_context.SetTarget(None);
        self.target = None;
        self.swap_chain.ResizeBuffers(
            2,
            width,
            height,
            DXGI_FORMAT_B8G8R8A8_UNORM,
            DXGI_SWAP_CHAIN_FLAG(0),
        )?;
        self.width = width;
        self.height = height;
        self.bind_target()?;
        Ok(())
    }

    pub fn context(&self) -> &ID2D1DeviceContext {
        &self.d2d_context
    }

    pub fn dwrite(&self) -> &IDWriteFactory {
        &self.dwrite
    }

    pub unsafe fn solid_brush(&mut self, color: &D2D1_COLOR_F) -> Result<&ID2D1SolidColorBrush> {
        let key = d2d_color_key(color);
        if !self.brushes.contains_key(&key) {
            let brush = self.d2d_context.CreateSolidColorBrush(color, None)?;
            self.brushes.insert(key, brush);
        }
        Ok(self.brushes.get(&key).unwrap())
    }
}

fn d2d_color_key(c: &D2D1_COLOR_F) -> u32 {
    let r = (c.r * 255.0) as u32;
    let g = (c.g * 255.0) as u32;
    let b = (c.b * 255.0) as u32;
    let a = (c.a * 255.0) as u32;
    (a << 24) | (r << 16) | (g << 8) | b
}
```

Key points:

- `D3D11CreateDevice` with `D3D11_CREATE_DEVICE_BGRA_SUPPORT` is required so D2D can render into the DXGI back buffer.
- `d3d_device`, `dxgi_device`, and `d2d_device` are stored in `D2dContext` so the COM objects stay alive.
- `bind_target` creates an `ID2D1Bitmap1` from the current DXGI back buffer and `SetTarget`s it. The bitmap is stored so the render target reference remains valid.
- `resize` clears the old target, resizes buffers, and rebinds.
- `solid_brush` caches solid brushes by color to avoid creating a brush per primitive call.

**Verification:** A small `examples/d2d_smoke.rs` (or a `#[cfg(test)]` integration with a hidden window) creates a `D2dContext`, clears to `#111114`, and returns `Ok(())`.

### Task 2 — D2D primitive helpers (`src/ui/d2d_gfx.rs`)

Provide `D2dGfx` that wraps `&ID2D1DeviceContext` and a small brush cache.

```rust
use std::collections::HashMap;
use windows::Win32::Graphics::Direct2D::{
    Common::{D2D1_COLOR_F, D2D_POINT_2F, D2D_RECT_F},
    D2D1_DRAW_TEXT_OPTIONS_CLIP, D2D1_ROUNDED_RECT, ID2D1DeviceContext,
    ID2D1SolidColorBrush, ID2D1StrokeStyle, ID2D1SvgGlyphStyle,
};
use windows::Win32::Graphics::DirectWrite::{
    DWRITE_MEASURING_MODE_NATURAL, DWRITE_PARAGRAPH_ALIGNMENT_CENTER,
    DWRITE_TEXT_ALIGNMENT_CENTER, IDWriteTextFormat,
};

pub fn d2d_color(r: f32, g: f32, b: f32, a: f32) -> D2D1_COLOR_F {
    D2D1_COLOR_F { r, g, b, a }
}

pub fn d2d_rect_f(x: f32, y: f32, w: f32, h: f32) -> D2D_RECT_F {
    D2D_RECT_F {
        left: x,
        top: y,
        right: x + w,
        bottom: y + h,
    }
}

pub fn d2d_rounded_rect(x: f32, y: f32, w: f32, h: f32, r: f32) -> D2D1_ROUNDED_RECT {
    D2D1_ROUNDED_RECT {
        rect: d2d_rect_f(x, y, w, h),
        radiusX: r,
        radiusY: r,
    }
}

pub struct D2dGfx<'a> {
    ctx: &'a ID2D1DeviceContext,
    brushes: HashMap<u32, ID2D1SolidColorBrush>,
}

impl<'a> D2dGfx<'a> {
    pub fn new(ctx: &'a ID2D1DeviceContext) -> Self {
        Self { ctx, brushes: HashMap::new() }
    }

    unsafe fn brush(&mut self, color: &D2D1_COLOR_F) -> Result<&ID2D1SolidColorBrush> {
        let key = d2d_color_key(color);
        if !self.brushes.contains_key(&key) {
            let brush = self.ctx.CreateSolidColorBrush(color, None)?;
            self.brushes.insert(key, brush);
        }
        Ok(self.brushes.get(&key).unwrap())
    }

    pub unsafe fn fill_rect(&mut self, rect: &D2D_RECT_F, color: &D2D1_COLOR_F) -> Result<()> {
        let brush = self.brush(color)?;
        self.ctx.FillRectangle(rect, brush);
        Ok(())
    }

    pub unsafe fn fill_rounded_rect(
        &mut self,
        rounded: &D2D1_ROUNDED_RECT,
        color: &D2D1_COLOR_F,
    ) -> Result<()> {
        let brush = self.brush(color)?;
        self.ctx.FillRoundedRectangle(rounded, brush);
        Ok(())
    }

    pub unsafe fn stroke_rounded_rect(
        &mut self,
        rounded: &D2D1_ROUNDED_RECT,
        color: &D2D1_COLOR_F,
        width: f32,
    ) -> Result<()> {
        let brush = self.brush(color)?;
        self.ctx
            .DrawRoundedRectangle(rounded, brush, width, None::<&ID2D1StrokeStyle>);
        Ok(())
    }

    pub unsafe fn draw_line(
        &mut self,
        x0: f32,
        y0: f32,
        x1: f32,
        y1: f32,
        color: &D2D1_COLOR_F,
        width: f32,
    ) -> Result<()> {
        let brush = self.brush(color)?;
        self.ctx.DrawLine(
            D2D_POINT_2F { x: x0, y: y0 },
            D2D_POINT_2F { x: x1, y: y1 },
            brush,
            width,
            None::<&ID2D1StrokeStyle>,
        );
        Ok(())
    }

    pub unsafe fn draw_text(
        &mut self,
        text: &[u16],
        format: &IDWriteTextFormat,
        rect: &D2D_RECT_F,
        color: &D2D1_COLOR_F,
    ) -> Result<()> {
        let brush = self.brush(color)?;
        self.ctx.DrawText(
            text,
            format,
            rect,
            brush,
            None::<&ID2D1SvgGlyphStyle>,
            0,
            D2D1_DRAW_TEXT_OPTIONS_CLIP,
            DWRITE_MEASURING_MODE_NATURAL,
        );
        Ok(())
    }
}

fn d2d_color_key(c: &D2D1_COLOR_F) -> u32 {
    let r = (c.r * 255.0) as u32;
    let g = (c.g * 255.0) as u32;
    let b = (c.b * 255.0) as u32;
    let a = (c.a * 255.0) as u32;
    (a << 24) | (r << 16) | (g << 8) | b
}
```

Core helpers:

- `fill_rect(ctx, rect, color)` — `ctx.FillRectangle(rect, brush)`.
- `fill_rounded_rect(ctx, rounded, color)` — `ctx.FillRoundedRectangle(&rounded, brush)`.
- `stroke_rounded_rect(ctx, rounded, color, width)` — `ctx.DrawRoundedRectangle(&rounded, brush, width, None::<&ID2D1StrokeStyle>)`.
- `draw_line(ctx, x0, y0, x1, y1, color, width)` — `ctx.DrawLine`.
- `fill_linear_gradient(ctx, rect, top, bottom)` — create a `ID2D1LinearGradientBrush` with two `D2D1_GRADIENT_STOP`s and `FillRectangle`.
- `draw_text(ctx, text, rect, format, color)` — `ctx.DrawText` with the `ID2D1DeviceContext` overload (pass `None::<&ID2D1SvgGlyphStyle>` and `0` for the SVG glyph/color-palette parameters).
- `draw_blur_panel` — deferred to Task 7; implement a solid fallback first.
- `draw_hline`, `draw_vline` — thin wrappers over `draw_line`.

**Verification:** Unit tests that construct a `D2D1Bitmap1` target, draw a 16×16 red rounded rect, and read back one pixel via `Map` or `CopyFromRenderTarget`. If reading back is too much work, verify by `cargo check` and a visual smoke test.

### Task 3 — Font cache (`src/ui/font.rs`)

```rust
pub struct FontCache {
    dwrite: IDWriteFactory,
    inter: IDWriteTextFormat,
    playfair: IDWriteTextFormat,
    fallback: IDWriteTextFormat,
}
```

Create `IDWriteTextFormat`:

```rust
fn make_format(
    dwrite: &IDWriteFactory,
    family: &[u16],
    weight: DWRITE_FONT_WEIGHT,
    size: f32,
) -> windows::core::Result<IDWriteTextFormat> {
    let locale: Vec<u16> = "en-us\0".encode_utf16().collect();
    let format = unsafe {
        dwrite.CreateTextFormat(
            PCWSTR(family.as_ptr()),
            None::<&IDWriteFontCollection>,
            weight,
            DWRITE_FONT_STYLE_NORMAL,
            DWRITE_FONT_STRETCH_NORMAL,
            size,
            PCWSTR(locale.as_ptr()),
        )?
    };
    Ok(format)
}
```

For measurement, use `IDWriteTextLayout`:

```rust
let text: Vec<u16> = "Artidor\0".encode_utf16().collect();
let layout = unsafe {
    dwrite.CreateTextLayout(
        &text, // &[u16]
        &format,
        width,
        height,
    )?
};
let mut metrics = DWRITE_TEXT_METRICS::default();
unsafe { layout.GetMetrics(&mut metrics)?; }
// metrics.width / metrics.height
```

**Verification:** `cargo test` checks `FontCache` returns non-zero width for `"Artidor"` and falls back to `Segoe UI` when `Inter` is not registered.

### Task 4 — Theme update (`src/theme.rs`)

Convert constants to `D2D1_COLOR_F` tuples and pixel radii:

```rust
pub const BG: (u8, u8, u8, f32) = (0x11, 0x11, 0x14, 1.0);
pub const PANEL_BG: (u8, u8, u8, f32) = (0x0f, 0x0f, 0x12, 0.55);
pub const PANEL_BORDER: (u8, u8, u8, f32) = (0xff, 0xff, 0xff, 0.06);
pub const PANEL_BORDER_TOP: (u8, u8, u8, f32) = (0xff, 0xff, 0xff, 0.10);
pub const TEXT_BRIGHT: (u8, u8, u8, f32) = (0xff, 0xff, 0xff, 0.92);
pub const TEXT_MUTED: (u8, u8, u8, f32) = (0xff, 0xff, 0xff, 0.64);
pub const TEXT_DIM: (u8, u8, u8, f32) = (0xff, 0xff, 0xff, 0.55);
pub const TEXT_FAINT: (u8, u8, u8, f32) = (0xff, 0xff, 0xff, 0.40);
pub const RADIUS_LG: f32 = 12.0;
pub const RADIUS_MD: f32 = 10.0;
pub const RADIUS_SM: f32 = 6.0;

pub fn to_d2d((r, g, b, a): (u8, u8, u8, f32)) -> D2D1_COLOR_F {
    D2D1_COLOR_F {
        r: r as f32 / 255.0,
        g: g as f32 / 255.0,
        b: b as f32 / 255.0,
        a,
    }
}
```

**Verification:** `cargo test` checks all color values are in `[0.0, 1.0]` and radii are positive.

### Task 5 — Layout + splitters (`src/ui/layout.rs`)

- Add `pub enum Splitter { ToolsPreview, PreviewProperties, TopTimeline }`.
- `Layout` stores the three splitter `D2D_RECT_F`s and current percentages.
- `Layout::compute(client_w, client_h, tools_pct, preview_pct, main_pct, track_label_w)` returns all panel rectangles.
- Default percentages: `tools_pct = 0.28`, `preview_pct = 0.47`, `main_pct = 0.64` (mirroring current constants).
- Clamp each percentage to `[0.10, 0.90]` and enforce minimum pixel widths (120 px for side panels, 160 px for timeline).

### Task 6 — Mouse splitter dragging (`src/window/shortcuts.rs`, `src/window/mod.rs`)

- Add `splitter_drag: Option<Splitter>` and `drag_start_x`, `drag_start_pct` to `WindowState`.
- `WM_LBUTTONDOWN` hit-tests splitter rects; if hit, start drag and set `SetCapture(hwnd)`.
- `WM_MOUSEMOVE` updates the matching percentage, calls `Layout::compute`, invalidates the parent and repositions the viewport child.
- `WM_LBUTTONUP` releases capture and clears `splitter_drag`.
- Draw 3 px splitter handles with a hover highlight when the cursor is over a splitter.

### Task 7 — Glass blur panel (`src/ui/d2d_gfx.rs`)

Defer until the solid-panel fallback is proven. The implementation path:

1. Draw a solid rounded rect with `PANEL_BG` alpha.
2. Add a 1 px `PANEL_BORDER` stroke.
3. Add a 1 px top-edge `PANEL_BORDER_TOP` line.
4. Add a drop shadow by drawing a darker, larger rounded rect behind with a `GaussianBlur` effect (CLSID `CLSID_D2D1GaussianBlur`).

```rust
let effect: ID2D1Effect = unsafe { ctx.CreateEffect(&CLSID_D2D1GaussianBlur)? };
unsafe {
    effect.SetInput(0, &shadow_bitmap, true);
    effect.SetValue(
        0, // D2D1_GAUSSIANBLUR_PROP_STANDARD_DEVIATION
        D2D1_PROPERTY_TYPE_FLOAT,
        &blur_radius.to_ne_bytes(),
    )?;
    ctx.DrawImage(
        &effect,
        None,
        None,
        D2D1_INTERPOLATION_MODE_LINEAR,
        D2D1_COMPOSITE_MODE_SOURCE_OVER,
    );
}
```

If blur is too expensive, fall back to a subtle solid shadow rectangle.

### Task 8 — Main paint loop (`src/main.rs`)

```rust
WM_PAINT => {
    let mut ps = PAINTSTRUCT::default();
    BeginPaint(hwnd, &mut ps);
    if let Some(d2d) = state.d2d.as_mut() {
        unsafe {
            d2d.begin_draw();
            d2d.clear(&theme::to_d2d(theme::BG))?;
            ui::paint(d2d, &state.layout, &state.project);
            d2d.end_draw()?;
        }
    }
    EndPaint(hwnd, &ps);
    0
}
WM_SIZE => {
    let (w, h) = (loword(lp as u32) as u32, hiword(lp as u32) as u32);
    if let Some(d2d) = state.d2d.as_mut() {
        let _ = unsafe { d2d.resize(w, h) };
    }
    state.layout = Layout::compute(w, h, ...);
    // reposition viewport child
    0
}
```

### Task 9 — Panel migration (one-by-one)

For each panel, replace `gfx.rs` calls with `d2d_gfx.rs` calls and add missing chrome.

1. **Header** (`src/ui/header.rs`) — glass bar, rounded corners, brand text, zoom capsule, action buttons.
2. **Footer** (`src/ui/footer.rs`) — glass status bar, status text.
3. **Tab bar** (`src/ui/tab_bar.rs`) — vertical rail, rounded active/hover states, icon glyphs.
4. **Assets panel** (`src/ui/assets/mod.rs`) — remove red fill, add `Library/Stock/Cloud` tabs, `VIDEOS/AUDIO/IMAGES` counters, empty state.
5. **Inspector** (`src/ui/inspector/mod.rs`) — glass panel, `DETAILS`/`PROJECT`/`ACTIVITY` sections, copy button row.
6. **Timeline** (`src/ui/timeline/mod.rs`) — scene switcher, track header, playhead, ruler.
7. **Viewport toolbar** (`src/ui/viewport_toolbar.rs`) — glass transport bar at bottom of preview, timecode, icon glyphs.
8. **Home / Projects** (`src/ui/welcome.rs`, `src/ui/projects.rs`) — glass panels, rounded cards, gradients, fonts.

After each panel, run `cargo run` and capture a Windows-MCP snapshot for visual comparison.

### Task 10 — Visual polish and verification

- Ensure no `CLIPCHILDREN`/`CLIPSIBLINGS` flags accidentally erase the D3D12 child.
- Double-buffering is not needed; the swap chain handles it.
- Run `cargo fmt`, `cargo check`, `cargo test`, `cargo run`.
- Capture final screenshots at 1920×1080 and 1280×720.
- Update `STATE.md` and `features/desktop-native-win32/STATE.md` with the new D2D status and manual QA notes.

## 6. API Reference (from `windows` 0.62.2)

Key signatures confirmed:

- `D3D11CreateDevice(None::<&IDXGIAdapter>, D3D_DRIVER_TYPE_HARDWARE, HMODULE(null_mut()), D3D11_CREATE_DEVICE_BGRA_SUPPORT, Some(&[D3D_FEATURE_LEVEL_11_0]), D3D11_SDK_VERSION, Some(&mut d3d), None, None)?`
- `d3d.cast::<IDXGIDevice>()?`
- `D2D1CreateDevice(&dxgi, None)?` → `ID2D1Device`
- `d2d_device.CreateDeviceContext(D2D1_DEVICE_CONTEXT_OPTIONS_NONE)?` → `ID2D1DeviceContext`
- `CreateDXGIFactory1::<IDXGIFactory2>()?`
- `factory.CreateSwapChainForHwnd(&d3d, hwnd, &desc, None, None)?` → `IDXGISwapChain1`
- `swap_chain.ResizeBuffers(2, width, height, DXGI_FORMAT_B8G8R8A8_UNORM, DXGI_SWAP_CHAIN_FLAG(0))?`
- `swap_chain.GetBuffer::<IDXGISurface2>(0)?`
- `d2d_context.CreateBitmapFromDxgiSurface(&back_buffer, Some(&props))?` → `ID2D1Bitmap1`
- `d2d_context.SetTarget(&bitmap)` / `SetTarget(None)`
- `d2d_context.BeginDraw()` / `d2d_context.EndDraw(None, None)?`
- `d2d_context.FillRectangle(&rect, brush)` / `FillRoundedRectangle(&rounded, brush)` / `DrawRoundedRectangle(&rounded, brush, width, None::<&ID2D1StrokeStyle>)`
- `d2d_context.CreateSolidColorBrush(&color, None)?` → `ID2D1SolidColorBrush`
- `d2d_context.DrawText(&text, &format, &rect, &brush, None::<&ID2D1SvgGlyphStyle>, 0, D2D1_DRAW_TEXT_OPTIONS_CLIP, DWRITE_MEASURING_MODE_NATURAL)`
- `DWriteCreateFactory::<IDWriteFactory>(DWRITE_FACTORY_TYPE_SHARED)?`
- `dwrite.CreateTextFormat(PCWSTR, None::<&IDWriteFontCollection>, weight, style, stretch, size, PCWSTR)?` → `IDWriteTextFormat`
- `format.SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER)?` / `SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER)?`
- `dwrite.CreateTextLayout(text, format, width, height)?` → `IDWriteTextLayout` (`text` is `&[u16]`)
- `layout.GetMetrics(&mut metrics)?`
- `swap_chain.Present(1, DXGI_PRESENT(0)).ok()?`

## 7. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| D3D12 child flicker under D2D parent | Keep `WS_CLIPCHILDREN`; sync child position on `WM_SIZE`; do not clear over the child rect. |
| Custom font loading failure | Bundle fonts in `assets/fonts/`; fall back to `Segoe UI` at the same size. |
| Direct2D blur too expensive at high DPI | Use `GaussianBlur` only for panels; cache the shadow bitmap; fall back to solid shadow. |
| Large surface area | Migrate panel-by-panel; keep `gfx.rs` as a compile-time fallback until all panels are converted. |
| `windows` crate API churn | Stay on `0.62.2` and pin exact feature list; no external helper crates. |

## 8. Rollback

- All changes are isolated to `apps/desktop-native/`.
- Work on a feature branch.
- `src/ui/gfx.rs` can remain behind a `gdi-fallback` Cargo feature until D2D is fully verified.
- If D2D is unstable, revert `src/main.rs` and `src/ui/mod.rs` to the GDI path while keeping the new D2D modules for future work.

## 9. What's New

Not updated. This is a foundational engineering change; the native desktop shell is not yet shipped to users.

## 10. Commands

```bash
cd apps/desktop-native
cargo fmt
cargo check
cargo test
cargo build --release
cargo run
```

After each major task, run `cargo check` and `cargo run` to catch regressions early.
