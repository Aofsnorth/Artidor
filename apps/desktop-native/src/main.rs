// Artidor native desktop shell — Win32 API + native WGPU/D3D12 compositor.
//
// Increment 2: 1:1 editor chrome around the native D3D12 viewport.
//
// Layout mirrors the web editor (`apps/web/src/app/editor/[project_id]`):
//   - header bar  h=48px, #111114 -> transparent, radial accent, hairline
//   - middle:     TabBar rail (72px) + panel group (assets|preview|properties
//                 on top row, timeline below), 8px padding + gaps
//   - footer bar  h=36px, #111114 -> #08080a, border-top, status text
// The D3D12 compositor surface lives on a child window positioned at the
// preview panel rect (standard Win32 editor pattern: GDI draws chrome on
// the parent, the GPU viewport is a child HWND — DXGI presents over the
// child only, so it never covers the chrome).
//
// Proportions match the web app's default layout preset
// (panel-store.ts: tools 28% / preview 47% / properties 25%;
//  mainContent 64% / timeline 36%). Chrome is rendered with GDI (no new
// dependency — solid fills + thin borders + text are exactly what GDI is
// for). The web app is intentionally kept and still ships.

// Native GUI subsystem: no extra console window on Windows.
#![windows_subsystem = "windows"]

mod copilot;
mod dialogs;
mod export;
mod persist;
mod state;

use std::num::NonZeroIsize;

use compositor::{CanvasClearDescriptor, Compositor, FrameDescriptor, RenderFrameOptions};
use gpu::{GpuContext, wgpu};
use pollster::block_on;
use state::{Project, Track, TrackType};
use windows::Win32::Foundation::{GetLastError, HINSTANCE, HWND, LPARAM, LRESULT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    BeginPaint, COLOR_WINDOW, CreatePen, CreateSolidBrush, DT_CENTER, DT_SINGLELINE, DT_VCENTER,
    DeleteObject, DrawTextW, EndPaint, FillRect, GetStockObject, HBRUSH, HOLLOW_BRUSH,
    InvalidateRect, PAINTSTRUCT, PS_SOLID, Rectangle, SelectObject, SetBkMode, SetTextColor,
    TRANSPARENT, UpdateWindow, ValidateRect,
};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetKeyState, VK_CONTROL, VK_DELETE, VK_DOWN, VK_LEFT, VK_RIGHT, VK_UP,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CS_HREDRAW, CS_VREDRAW, CW_USEDEFAULT, CreateWindowExW, DefWindowProcW, DestroyWindow,
    DispatchMessageW, GWLP_USERDATA, GetClientRect, GetMessageW, GetWindowLongPtrW, IDC_ARROW,
    KillTimer, LoadCursorW, MB_ICONERROR, MB_OK, MSG, MessageBoxW, MoveWindow, PostQuitMessage,
    RegisterClassW, SW_SHOW, SetTimer, SetWindowLongPtrW, ShowWindow, TranslateMessage,
    WINDOW_EX_STYLE, WM_DESTROY, WM_ERASEBKGND, WM_KEYDOWN, WM_LBUTTONDOWN, WM_PAINT, WM_SIZE,
    WM_TIMER, WNDCLASSW, WS_CHILD, WS_CLIPCHILDREN, WS_OVERLAPPEDWINDOW, WS_VISIBLE,
};
use windows::core::{Error, HRESULT, PCWSTR, w};

// ---------------------------------------------------------------------------
// Constants — 1:1 with the web editor
// ---------------------------------------------------------------------------

const CLASS_NAME: PCWSTR = w!("ArtidorNativeWndClass");
const CHILD_CLASS_NAME: PCWSTR = w!("ArtidorNativeViewportClass");
const WINDOW_TITLE: PCWSTR = w!("Artidor — Native");
const WINDOW_WIDTH: i32 = 1280;
const WINDOW_HEIGHT: i32 = 800;

/// Header height: web `h-12` = 48px.
const HEADER_H: i32 = 48;
/// Footer height: web `h-9` = 36px.
const FOOTER_H: i32 = 36;
/// TabBar rail width: web `w-[4.5rem]` = 72px.
const TABBAR_W: i32 = 72;
/// Outer padding / inter-panel gap: web `p-2` / `gap-2` = 8px.
const PAD: i32 = 8;
const GAP: i32 = 8;

/// Default split percentages (panel-store.ts "default" preset).
const MAIN_CONTENT_PCT: f32 = 0.64;
const TOOLS_PCT: f32 = 0.28;
const PREVIEW_PCT: f32 = 0.47;

/// Minimum timeline display duration in seconds (the seekable range when
/// the project has no elements yet). Once elements exist, the real
/// duration from `metadata.duration_seconds` is used instead.
const TIMELINE_MIN_SECONDS: f64 = 30.0;

/// Timer ID for the playback loop (frame-accurate playhead advance).
const PLAYBACK_TIMER_ID: usize = 1;

/// Editor background `#111114`.
const BG: u32 = 0x111114;
/// Footer bottom gradient `#08080a`.
const BG_DARK: u32 = 0x08080a;
/// `white/10` border ≈ RGB(26,26,30).
const BORDER: u32 = 0x1A1A1E;
/// `white/[0.08]` border ≈ RGB(20,20,24).
const BORDER_FAINT: u32 = 0x141418;
/// `white/[0.48]` text ≈ RGB(122,122,127).
const TEXT_DIM: u32 = 0x7A7A7F;
/// `white/[0.32]` text ≈ RGB(81,81,86).
const TEXT_FAINT: u32 = 0x515156;
/// `white/85` storage bar ≈ RGB(216,216,219).
const TEXT_BRIGHT: u32 = 0xD8D8DB;
/// Editor background clear for the compositor, normalised RGBA.
const EDITOR_BG_CLEAR: [f32; 4] = [17.0 / 255.0, 17.0 / 255.0, 20.0 / 255.0, 1.0];

fn rgb(c: u32) -> u32 {
    // Win32 COLORREF is 0x00BBGGRR; our consts are 0xRRGGBB.
    ((c & 0xFF) << 16) | (c & 0xFF00) | ((c >> 16) & 0xFF)
}

// ---------------------------------------------------------------------------
// Layout — mirrors the web editor's resizable panel structure
// ---------------------------------------------------------------------------

/// All chrome rectangles derived from the parent client size. The
/// `viewport` rect is where the D3D12 child window lives.
#[derive(Clone, Copy, Default)]
struct Layout {
    header: RECT,
    footer: RECT,
    tabbar: RECT,
    tools: RECT,
    preview: RECT,
    properties: RECT,
    timeline: RECT,
    /// The D3D12 viewport child window rect (== preview panel).
    viewport: RECT,
}

impl Layout {
    fn compute(w: i32, h: i32) -> Self {
        let mut l = Layout::default();
        l.header = RECT {
            left: 0,
            top: 0,
            right: w,
            bottom: HEADER_H,
        };
        l.footer = RECT {
            left: 0,
            top: h - FOOTER_H,
            right: w,
            bottom: h,
        };

        // Middle area between header and footer.
        let mid_top = HEADER_H;
        let mid_bottom = h - FOOTER_H;
        let mid_h = mid_bottom - mid_top;
        // Inner content area after outer padding (p-2, pt-0).
        let inner_x = PAD;
        let inner_y = mid_top;
        let inner_w = (w - 2 * PAD).max(0);
        let inner_h = (mid_h - PAD).max(0); // pt-0 -> no top pad, pad bottom

        // TabBar rail (fixed width) + gap + panel group.
        l.tabbar = RECT {
            left: inner_x,
            top: inner_y,
            right: inner_x + TABBAR_W,
            bottom: inner_y + inner_h,
        };
        let pg_x = inner_x + TABBAR_W + GAP;
        let pg_w = (inner_x + inner_w - pg_x).max(0);

        // Vertical split: mainContent row / timeline (with one gap).
        let split_h = (inner_h - GAP).max(0);
        let main_h = (split_h as f32 * MAIN_CONTENT_PCT) as i32;

        // Top row: tools | preview | properties (two gaps).
        let row_w = pg_w;
        let row_gap_total = 2 * GAP;
        let avail_w = (row_w - row_gap_total).max(0);
        let tools_w = (avail_w as f32 * TOOLS_PCT) as i32;
        let preview_w = (avail_w as f32 * PREVIEW_PCT) as i32;

        let row_y = inner_y;
        let row_h = main_h;
        l.tools = RECT {
            left: pg_x,
            top: row_y,
            right: pg_x + tools_w,
            bottom: row_y + row_h,
        };
        l.preview = RECT {
            left: pg_x + tools_w + GAP,
            top: row_y,
            right: pg_x + tools_w + GAP + preview_w,
            bottom: row_y + row_h,
        };
        l.properties = RECT {
            left: pg_x + tools_w + GAP + preview_w + GAP,
            top: row_y,
            right: pg_x + row_w,
            bottom: row_y + row_h,
        };

        // Timeline below the top row.
        l.timeline = RECT {
            left: pg_x,
            top: row_y + row_h + GAP,
            right: pg_x + row_w,
            bottom: inner_y + inner_h,
        };

        // Viewport child window = preview panel (1:1 with the web canvas).
        l.viewport = l.preview;
        l
    }
}

// ---------------------------------------------------------------------------
// Native compositor renderer — top-1 preview path (WGPU/D3D12, zero
// CPU readback). Reuses the repo's own `gpu` + `compositor` crates.
// ---------------------------------------------------------------------------

struct Renderer {
    context: GpuContext,
    compositor: Compositor,
    surface: wgpu::Surface<'static>,
}

impl Renderer {
    fn new(hwnd: HWND) -> Result<Self, Box<dyn std::error::Error>> {
        let context = block_on(GpuContext::new())?;
        let compositor = Compositor::new(&context);
        let hwnd_value = NonZeroIsize::new(hwnd.0 as isize).ok_or("HWND is null")?;
        let target = wgpu::SurfaceTargetUnsafe::RawHandle {
            raw_display_handle: Some(wgpu::rwh::RawDisplayHandle::Windows(
                wgpu::rwh::WindowsDisplayHandle::new(),
            )),
            raw_window_handle: wgpu::rwh::RawWindowHandle::Win32(
                wgpu::rwh::Win32WindowHandle::new(hwnd_value),
            ),
        };
        let surface = unsafe { context.instance().create_surface_unsafe(target) }?;
        Ok(Self {
            context,
            compositor,
            surface,
        })
    }

    fn render(&mut self, width: u32, height: u32) -> Result<(), compositor::CompositorError> {
        if width == 0 || height == 0 {
            return Ok(());
        }
        let frame = FrameDescriptor {
            width,
            height,
            clear: CanvasClearDescriptor {
                color: EDITOR_BG_CLEAR,
            },
            items: Vec::new(),
        };
        self.compositor.render_frame(
            &self.context,
            RenderFrameOptions {
                frame: &frame,
                surface: &self.surface,
            },
        )
    }

    /// Export a video via the top-1 native FFmpeg pipeline (Increment 6b).
    /// Renders `opts.frame_count` frames through the compositor and pipes
    /// them to FFmpeg, which encodes to `.mp4` with hardware acceleration.
    fn export_video(
        &mut self,
        project: &Project,
        opts: &export::ExportOptions,
    ) -> Result<std::path::PathBuf, export::ExportError> {
        export::export_video(&self.context, &mut self.compositor, project, opts)
    }
}

// ---------------------------------------------------------------------------
// GDI chrome painting helpers
// ---------------------------------------------------------------------------

/// Fill `rect` with a solid colour.
unsafe fn fill_rect(hdc: windows::Win32::Graphics::Gdi::HDC, rect: &RECT, color: u32) {
    let brush = unsafe { CreateSolidBrush(windows::Win32::Foundation::COLORREF(rgb(color))) };
    let _ = unsafe { FillRect(hdc, rect, brush) };
    unsafe {
        let _ = DeleteObject(brush.into());
    }
}

/// Draw a 1px hairline border inside `rect` with `color` (outline only —
/// uses the hollow stock brush so `Rectangle` does not fill the interior).
unsafe fn border_rect(hdc: windows::Win32::Graphics::Gdi::HDC, rect: &RECT, color: u32) {
    unsafe {
        let pen = CreatePen(
            PS_SOLID,
            1,
            windows::Win32::Foundation::COLORREF(rgb(color)),
        );
        let prev_pen = SelectObject(hdc, pen.into());
        let hollow = GetStockObject(HOLLOW_BRUSH);
        let prev_brush = SelectObject(hdc, hollow);
        let inset = RECT {
            left: rect.left,
            top: rect.top,
            right: rect.right - 1,
            bottom: rect.bottom - 1,
        };
        let _ = Rectangle(hdc, inset.left, inset.top, inset.right, inset.bottom);
        let _ = SelectObject(hdc, prev_pen);
        let _ = SelectObject(hdc, prev_brush);
        // Delete the custom pen; stock objects must not be deleted.
        let _ = DeleteObject(pen.into());
    }
}

/// Draw a single line of centred text inside `rect` with `color`.
unsafe fn draw_text_centered(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    text: &str,
    rect: &RECT,
    color: u32,
) {
    unsafe {
        SetTextColor(hdc, windows::Win32::Foundation::COLORREF(rgb(color)));
        SetBkMode(hdc, TRANSPARENT);
        let mut buf: Vec<u16> = text.encode_utf16().collect();
        let mut r = *rect;
        let _ = DrawTextW(
            hdc,
            &mut buf,
            &mut r as *mut _,
            DT_CENTER | DT_SINGLELINE | DT_VCENTER,
        );
    }
}

/// Paint the editor chrome (everything except the viewport child window).
/// Project data drives the labels (header name, footer settings, timeline
/// playhead, properties info) — wired from the `state` model (Increment 4).
unsafe fn paint_chrome(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    layout: &Layout,
    client: &RECT,
    project: &Project,
    selected_track: usize,
    playing: bool,
    selected_element: Option<(usize, usize)>,
    teleprompter_text: &str,
    teleprompter_on: bool,
) {
    unsafe {
        // Whole client base fill (#111114) — panels sit on this.
        fill_rect(hdc, client, BG);

        // Header: #111114 base + top hairline (web: via-white/10).
        // Label = project name (web: EditableProjectName in the header pod).
        fill_rect(hdc, &layout.header, BG);
        border_rect(hdc, &layout.header, BORDER);
        draw_text_centered(hdc, &project.metadata.name, &layout.header, TEXT_BRIGHT);

        // Footer: gradient approximated as #111114 -> #08080a. GDI has no
        // easy gradient without msimg32; a two-band fill reads close enough
        // at 36px and avoids a new dependency.
        let fh = layout.footer.bottom - layout.footer.top;
        let top_band = RECT {
            left: layout.footer.left,
            top: layout.footer.top,
            right: layout.footer.right,
            bottom: layout.footer.top + fh / 2,
        };
        let bot_band = RECT {
            left: layout.footer.left,
            top: layout.footer.top + fh / 2,
            right: layout.footer.right,
            bottom: layout.footer.bottom,
        };
        fill_rect(hdc, &top_band, BG);
        fill_rect(hdc, &bot_band, BG_DARK);
        // Footer top border (web: border-t white/[0.08]).
        border_rect(hdc, &layout.footer, BORDER_FAINT);
        // Footer: left = play/pause + timecode, center = settings,
        // right = clip count. The play/pause indicator is a text glyph
        // (▶ / ⏸) since GDI doesn't do SVG icons.
        let duration = timeline_duration(project);
        let current = project.playhead.as_seconds();
        let play_glyph = if playing { "\u{23F8}" } else { "\u{25B6}" }; // ⏸ / ▶
        let time_label = format!("{}  {:07.2}s / {:07.2}s", play_glyph, current, duration);
        let left_rect = RECT {
            left: layout.footer.left + 12,
            top: layout.footer.top,
            right: layout.footer.left + 200,
            bottom: layout.footer.bottom,
        };
        draw_text_left(hdc, &time_label, &left_rect, TEXT_BRIGHT);

        // Center: settings (matches web editor-footer.tsx).
        let footer_label = format!(
            "{}p  \u{2022}  {} fps  \u{2022}  {}  \u{2022}  Stereo",
            project.settings.canvas.height,
            project.settings.fps_label(),
            project.settings.canvas.aspect_label(),
        );
        draw_text_centered(hdc, &footer_label, &layout.footer, TEXT_DIM);

        // TabBar rail: panel + border (web: glass-strong, border-white/10).
        fill_rect(hdc, &layout.tabbar, BG_DARK);
        border_rect(hdc, &layout.tabbar, BORDER);
        draw_text_centered(hdc, "Assets", &layout.tabbar, TEXT_FAINT);

        // Tools panel: imported media assets list (web: the assets panel).
        // Shows each asset's kind tag + name. Empty state shows a hint.
        fill_rect(hdc, &layout.tools, BG);
        border_rect(hdc, &layout.tools, BORDER_FAINT);
        draw_assets_list(hdc, &layout.tools, project);
        // Copilot suggestions below the assets list (Increment 5).
        // Non-network stub: canned suggestions based on project state.
        draw_copilot_suggestions(hdc, &layout.tools, project);

        // Properties panel: project metadata + settings (web: the
        // properties inspector shows element props; with no elements yet
        // this shows project identity + render settings as a field list).
        fill_rect(hdc, &layout.properties, BG);
        border_rect(hdc, &layout.properties, BORDER_FAINT);
        draw_properties_panel(hdc, &layout.properties, project, selected_element);

        // Timeline panel: track list (one row per track) + playhead
        // readout at the bottom. Mirrors web timeline: a vertical list
        // of tracks, each with its type label and name.
        fill_rect(hdc, &layout.timeline, BG);
        border_rect(hdc, &layout.timeline, BORDER_FAINT);
        draw_timeline_tracks(
            hdc,
            &layout.timeline,
            project,
            selected_track,
            playing,
            selected_element,
        );

        // Preview panel frame (the viewport child covers the interior).
        border_rect(hdc, &layout.preview, BORDER_FAINT);

        // Teleprompter overlay (Increment 5). Scrolls text vertically
        // over the preview based on the playhead position. The text
        // wraps by words; lines scroll up as the playhead advances.
        if teleprompter_on && !teleprompter_text.is_empty() {
            draw_teleprompter_overlay(hdc, &layout.preview, project, teleprompter_text);
        }
    }
}

/// Draw the teleprompter overlay: a semi-transparent dark band across
/// the lower third of the preview, with scrolling text. The scroll
/// position is proportional to the playhead's fraction of the timeline
/// duration. Text wraps by words to fit the band width.
unsafe fn draw_teleprompter_overlay(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    preview: &RECT,
    project: &Project,
    text: &str,
) {
    unsafe {
        let pw = preview.right - preview.left;
        let ph = preview.bottom - preview.top;
        // Band: lower 35% of the preview.
        let band_h = (ph * 35 / 100).max(60);
        let band = RECT {
            left: preview.left,
            top: preview.bottom - band_h,
            right: preview.right,
            bottom: preview.bottom,
        };
        // Semi-transparent dark fill (approximated — GDI has no alpha
        // without layered windows; a dark solid fill reads as overlay).
        fill_rect(hdc, &band, 0x05050A);

        // Wrap text into lines that fit the band width.
        let inner_w = pw - 24;
        let lines = wrap_text(text, inner_w as usize);

        // Scroll: the playhead fraction determines how far through the
        // text we are. At 0%, the first lines are at the top of the band.
        // At 100%, the last lines are at the top (scrolled past).
        let duration = timeline_duration(project).max(0.1);
        let frac = (project.playhead.as_seconds() / duration).clamp(0.0, 1.0);
        let line_h = 20;
        let total_lines = lines.len();
        let visible_lines = (band_h / line_h) as usize;
        let scroll_lines = if total_lines > visible_lines {
            ((frac * total_lines as f64) as usize).min(total_lines.saturating_sub(visible_lines))
        } else {
            0
        };

        let mut y = band.top + 8;
        for line in lines.iter().skip(scroll_lines).take(visible_lines) {
            if y + line_h > band.bottom {
                break;
            }
            let line_rect = RECT {
                left: band.left + 12,
                top: y,
                right: band.right - 12,
                bottom: y + line_h,
            };
            draw_text_centered(hdc, line, &line_rect, 0xF0F0F4);
            y += line_h;
        }
    }
}

/// Naive word-wrap: splits `text` into lines that fit `max_chars` (approx
/// — uses char count, not pixel width, since GDI text measurement per
/// call would be slow in a paint loop). Good enough for a teleprompter.
fn wrap_text(text: &str, max_chars: usize) -> Vec<String> {
    if max_chars == 0 {
        return vec![text.to_string()];
    }
    let mut lines = Vec::new();
    for paragraph in text.split('\n') {
        if paragraph.is_empty() {
            lines.push(String::new());
            continue;
        }
        let mut current = String::new();
        for word in paragraph.split_whitespace() {
            if current.is_empty() {
                current = word.to_string();
            } else if current.len() + 1 + word.len() <= max_chars {
                current.push(' ');
                current.push_str(word);
            } else {
                lines.push(current.clone());
                current = word.to_string();
            }
        }
        if !current.is_empty() {
            lines.push(current);
        }
    }
    if lines.is_empty() {
        lines.push(String::new());
    }
    lines
}

/// Track-row height in px (web timeline tracks are ~36-60px; 28px keeps
/// several tracks visible without scrolling in the default layout).
const TRACK_ROW_H: i32 = 28;
/// Padding inside the timeline panel (top/left for the track list).
const TRACK_PAD: i32 = 8;
/// Playhead indicator colour (bright white/70 ≈ RGB(179,179,184)).
const PLAYHEAD_COLOR: u32 = 0xB3B3B8;

/// The effective timeline duration for seeking / display, in seconds.
/// Uses the project's real duration if non-zero, else a minimum display
/// range so the timeline is usable for empty projects.
fn timeline_duration(project: &Project) -> f64 {
    if project.metadata.duration_seconds > 0.0 {
        project.metadata.duration_seconds
    } else {
        TIMELINE_MIN_SECONDS
    }
}

/// Draw the timeline track list + a playhead readout at the bottom.
/// One row per track: "[type] name  (muted/hidden)".
unsafe fn draw_timeline_tracks(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    panel: &RECT,
    project: &Project,
    selected_track: usize,
    project_is_playing: bool,
    selected_element: Option<(usize, usize)>,
) {
    unsafe {
        let panel_h = panel.bottom - panel.top;
        let panel_w = panel.right - panel.left;
        // Reserve a strip at the bottom for the playhead readout.
        let readout_h = 22;
        let list_bottom = panel.bottom - readout_h;

        // Track rows from the top.
        let duration = timeline_duration(project);
        let mut y = panel.top + TRACK_PAD;
        for (i, track) in project.scene.tracks.iter().enumerate() {
            if y + TRACK_ROW_H > list_bottom {
                break; // no scrolling yet; clip remaining tracks
            }
            let row = RECT {
                left: panel.left + TRACK_PAD,
                top: y,
                right: panel.left + panel_w - TRACK_PAD,
                bottom: y + TRACK_ROW_H - 2,
            };
            // Row background: slightly lighter than panel for separation.
            fill_rect(hdc, &row, BG_DARK);
            // Selected track: brighter border (white/30 ≈ RGB(77,77,82)).
            if i == selected_track {
                border_rect(hdc, &row, 0x4D4D52);
            }
            // Type tag colour by track type (matches web type-based palette).
            let tag_color = match track.track_type {
                TrackType::Video => 0x3B5BDB,   // blue
                TrackType::Text => 0xE64980,    // pink
                TrackType::Audio => 0x20C997,   // teal
                TrackType::Graphic => 0xFAB005, // amber
            };
            let tag = RECT {
                left: row.left + 4,
                top: row.top + 4,
                right: row.left + 52,
                bottom: row.bottom - 4,
            };
            fill_rect(hdc, &tag, tag_color);
            draw_text_centered(hdc, track.track_type.label(), &tag, 0x111114);

            // Name + state flags (fixed-width header area).
            let mut label = track.name.clone();
            if track.muted {
                label.push_str("  (muted)");
            }
            if track.hidden {
                label.push_str("  (hidden)");
            }
            // Header area: tag + name, fixed 140px wide. Clip area is
            // the remaining space to the right.
            let header_right = row.left + 140;
            let name_rect = RECT {
                left: tag.right + 8,
                top: row.top,
                right: header_right,
                bottom: row.bottom,
            };
            // Selected track name is brighter so it reads as active.
            let name_color = if i == selected_track {
                TEXT_BRIGHT
            } else {
                TEXT_DIM
            };
            draw_text_left(hdc, &label, &name_rect, name_color);

            // Clip blocks: draw each element as a colored block in the
            // clip area (right of the header), positioned by start/duration
            // relative to the timeline duration. The block colour is a
            // dimmed version of the track's type-tag colour.
            if duration > 0.0 {
                let clip_area_left = header_right + 4;
                let clip_area_right = row.right - 4;
                let clip_area_w = (clip_area_right - clip_area_left).max(1) as f64;
                for (ei, element) in track.elements.iter().enumerate() {
                    let start_frac = (element.start_seconds / duration).clamp(0.0, 1.0);
                    let end_frac = (element.end_seconds() / duration).clamp(0.0, 1.0);
                    let clip_x = clip_area_left + (start_frac * clip_area_w) as i32;
                    let clip_w = ((end_frac - start_frac) * clip_area_w) as i32;
                    if clip_w < 2 {
                        continue; // too small to render
                    }
                    let clip_rect = RECT {
                        left: clip_x,
                        top: row.top + 3,
                        right: clip_x + clip_w,
                        bottom: row.bottom - 3,
                    };
                    // Dimmed track-type colour for the clip body.
                    let clip_color = match track.track_type {
                        TrackType::Video => 0x2A3F8C,   // dim blue
                        TrackType::Text => 0xA8365C,    // dim pink
                        TrackType::Audio => 0x178E6B,   // dim teal
                        TrackType::Graphic => 0xB8860B, // dim amber
                    };
                    fill_rect(hdc, &clip_rect, clip_color);
                    // Selected clip: bright white border (white/70).
                    let clip_border = if selected_element == Some((i, ei)) {
                        0xB3B3B8 // bright — selected
                    } else {
                        tag_color // normal — track-type colour
                    };
                    border_rect(hdc, &clip_rect, clip_border);
                    // Clip name (if there's room).
                    if clip_w > 30 {
                        draw_text_left(hdc, &element.name, &clip_rect, 0xE8E8EC);
                    }
                }
            }

            y += TRACK_ROW_H;
        }

        // Playhead position indicator: a vertical line across the track
        // list area, positioned by the playhead's fraction of the
        // timeline duration. Lets the user see where they are (and
        // click-to-seek targets this scale).
        if duration > 0.0 {
            let frac = (project.playhead.as_seconds() / duration).clamp(0.0, 1.0);
            let track_area_left = panel.left + TRACK_PAD;
            let track_area_right = panel.left + panel_w - TRACK_PAD;
            let track_area_w = (track_area_right - track_area_left).max(1);
            let px = track_area_left + (frac * track_area_w as f64) as i32;
            let pen = CreatePen(
                PS_SOLID,
                2,
                windows::Win32::Foundation::COLORREF(rgb(PLAYHEAD_COLOR)),
            );
            let old = SelectObject(hdc, pen.into());
            let _ = Rectangle(hdc, px, panel.top + TRACK_PAD, px + 2, list_bottom);
            let _ = SelectObject(hdc, old);
            let _ = DeleteObject(pen.into());
        }

        // Playhead readout at the bottom strip — includes shortcut hints.
        let readout = RECT {
            left: panel.left,
            top: list_bottom,
            right: panel.right,
            bottom: panel.bottom,
        };
        let frame = project
            .playhead
            .frame_floor(project.settings.fps)
            .unwrap_or(0);
        let readout_label = format!(
            "Playhead {:.3}s (frame {})  {}  \u{2022}  {} tracks  \u{2022}  \u{2190}\u{2192} seek  \u{2191}\u{2193} select  T track  E clip  M mute  Space play  Ctrl+R rename  Ctrl+S/O/I/E",
            project.playhead.as_seconds(),
            frame,
            if project_is_playing {
                "[PLAYING]"
            } else {
                "[PAUSED]"
            },
            project.scene.tracks.len(),
        );
        draw_text_centered(hdc, &readout_label, &readout, TEXT_FAINT);
    }
}

/// Asset-row height in px (matches the track row height for visual
/// consistency across panels).
const ASSET_ROW_H: i32 = 28;
/// Padding inside the tools/assets panel.
const ASSET_PAD: i32 = 8;

/// Draw the imported media assets list in the tools panel. One row per
/// asset: "[kind] name". Empty state shows an "Import media (Ctrl+I)"
/// hint so the user knows how to populate it.
unsafe fn draw_assets_list(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    panel: &RECT,
    project: &Project,
) {
    unsafe {
        let panel_w = panel.right - panel.left;

        // Header strip at the top of the panel.
        let header = RECT {
            left: panel.left,
            top: panel.top,
            right: panel.right,
            bottom: panel.top + 24,
        };
        let header_label = format!("Assets  ({})", project.assets.len());
        draw_text_left(hdc, &header_label, &header, TEXT_DIM);

        if project.assets.is_empty() {
            let hint = RECT {
                left: panel.left + ASSET_PAD,
                top: panel.top + 32,
                right: panel.right - ASSET_PAD,
                bottom: panel.top + 56,
            };
            draw_text_centered(hdc, "Import media (Ctrl+I)", &hint, TEXT_FAINT);
            return;
        }

        // Asset rows below the header.
        let mut y = panel.top + 28;
        for asset in &project.assets {
            if y + ASSET_ROW_H > panel.bottom {
                break; // no scrolling yet; clip remaining assets
            }
            let row = RECT {
                left: panel.left + ASSET_PAD,
                top: y,
                right: panel.left + panel_w - ASSET_PAD,
                bottom: y + ASSET_ROW_H - 2,
            };
            fill_rect(hdc, &row, BG_DARK);

            // Kind tag colour (matches the track-type palette).
            let tag_color = match asset.kind {
                state::MediaKind::Image => 0xFAB005, // amber
                state::MediaKind::Video => 0x3B5BDB, // blue
                state::MediaKind::Audio => 0x20C997, // teal
                state::MediaKind::Other => 0x868E96, // gray
            };
            let tag = RECT {
                left: row.left + 4,
                top: row.top + 4,
                right: row.left + 52,
                bottom: row.bottom - 4,
            };
            fill_rect(hdc, &tag, tag_color);
            draw_text_centered(hdc, asset.kind.label(), &tag, 0x111114);

            // Asset name (left-aligned, next to the tag).
            let name_rect = RECT {
                left: tag.right + 8,
                top: row.top,
                right: row.right - 4,
                bottom: row.bottom,
            };
            draw_text_left(hdc, &asset.name, &name_rect, TEXT_DIM);
            y += ASSET_ROW_H;
        }
    }
}

/// Draw copilot suggestions in the lower portion of the tools panel
/// (Increment 5). Non-network: canned suggestions from `copilot::suggest`.
unsafe fn draw_copilot_suggestions(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    panel: &RECT,
    project: &Project,
) {
    unsafe {
        // Place the copilot section in the bottom 40% of the tools panel,
        // below the assets list. This avoids overlap with asset rows.
        let panel_h = panel.bottom - panel.top;
        let copilot_top = panel.top + (panel_h * 55 / 100).max(180);
        let section = RECT {
            left: panel.left,
            top: copilot_top,
            right: panel.right,
            bottom: panel.bottom,
        };
        // Separator line.
        let sep = RECT {
            left: panel.left + 8,
            top: copilot_top,
            right: panel.right - 8,
            bottom: copilot_top + 1,
        };
        fill_rect(hdc, &sep, BORDER_FAINT);

        // Header.
        let header = RECT {
            left: panel.left + 8,
            top: copilot_top + 6,
            right: panel.right - 8,
            bottom: copilot_top + 24,
        };
        draw_text_left(hdc, "AI Copilot  (local stub)", &header, TEXT_DIM);

        // Suggestions.
        let suggestions = copilot::suggest(project);
        let mut y = copilot_top + 28;
        for s in &suggestions {
            if y + 34 > section.bottom {
                break;
            }
            // Title.
            let title_rect = RECT {
                left: panel.left + 10,
                top: y,
                right: panel.right - 10,
                bottom: y + 16,
            };
            draw_text_left(hdc, &s.title, &title_rect, TEXT_BRIGHT);
            // Description (truncated by GDI auto-clip).
            let desc_rect = RECT {
                left: panel.left + 10,
                top: y + 16,
                right: panel.right - 10,
                bottom: y + 32,
            };
            draw_text_left(hdc, &s.description, &desc_rect, TEXT_FAINT);
            y += 36;
        }
    }
}

/// Padding inside the properties panel.
const PROP_PAD: i32 = 10;
/// Row height for property fields.
const PROP_ROW_H: i32 = 20;

/// Draw the properties panel as a field list: project name, id, version,
/// duration, canvas size, fps, aspect ratio, track count, asset count.
/// The name row includes a "(Ctrl+R to rename)" hint. This is the
/// web app's properties inspector with no element selected — it shows
/// project-level settings.
unsafe fn draw_properties_panel(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    panel: &RECT,
    project: &Project,
    selected_element: Option<(usize, usize)>,
) {
    unsafe {
        // Header.
        let header = RECT {
            left: panel.left + PROP_PAD,
            top: panel.top + 6,
            right: panel.right - PROP_PAD,
            bottom: panel.top + 24,
        };

        let mut y = panel.top + 28;
        let left = panel.left + PROP_PAD;
        let right = panel.right - PROP_PAD;

        // If a clip is selected, show clip properties. Otherwise show
        // project properties (the web app's "no selection" state).
        if let Some((ti, ei)) = selected_element {
            if let Some(track) = project.scene.tracks.get(ti) {
                if let Some(element) = track.elements.get(ei) {
                    draw_text_left(hdc, "Clip Properties", &header, TEXT_DIM);
                    let fields: [(&str, String); 5] = [
                        ("Name", element.name.clone()),
                        ("ID", element.id.clone()),
                        ("Track", track.name.clone()),
                        ("Start", format!("{:.2}s", element.start_seconds)),
                        ("Duration", format!("{:.2}s", element.duration_seconds)),
                    ];
                    for (label, value) in &fields {
                        if y + PROP_ROW_H > panel.bottom {
                            break;
                        }
                        let label_rect = RECT {
                            left,
                            top: y,
                            right: left + 70,
                            bottom: y + PROP_ROW_H,
                        };
                        draw_text_left(hdc, label, &label_rect, TEXT_FAINT);
                        let value_rect = RECT {
                            left: left + 78,
                            top: y,
                            right,
                            bottom: y + PROP_ROW_H,
                        };
                        draw_text_left(hdc, value, &value_rect, TEXT_DIM);
                        y += PROP_ROW_H;
                    }
                    // Hint: Delete to remove.
                    if y + PROP_ROW_H <= panel.bottom {
                        let hint_rect = RECT {
                            left,
                            top: y + 8,
                            right,
                            bottom: y + PROP_ROW_H + 8,
                        };
                        draw_text_left(hdc, "Del = remove clip", &hint_rect, TEXT_FAINT);
                    }
                    return;
                }
            }
        }

        // Project properties (no clip selected).
        draw_text_left(hdc, "Properties", &header, TEXT_DIM);

        // Field rows: "label: value" pairs.
        let duration = timeline_duration(project);
        let fields: [(&str, String); 8] = [
            ("Name", format!("{}  (Ctrl+R)", project.metadata.name)),
            ("ID", project.metadata.id.clone()),
            ("Version", format!("v{}", project.version)),
            ("Duration", format!("{:.1}s", duration)),
            (
                "Canvas",
                format!(
                    "{}\u{00D7}{}",
                    project.settings.canvas.width, project.settings.canvas.height
                ),
            ),
            ("FPS", format!("{}", project.settings.fps_label())),
            ("Aspect", project.settings.canvas.aspect_label()),
            (
                "Tracks / Assets",
                format!("{} / {}", project.scene.tracks.len(), project.assets.len()),
            ),
        ];

        for (label, value) in &fields {
            if y + PROP_ROW_H > panel.bottom {
                break;
            }
            let label_rect = RECT {
                left,
                top: y,
                right: left + 70,
                bottom: y + PROP_ROW_H,
            };
            draw_text_left(hdc, label, &label_rect, TEXT_FAINT);

            let value_rect = RECT {
                left: left + 78,
                top: y,
                right,
                bottom: y + PROP_ROW_H,
            };
            draw_text_left(hdc, value, &value_rect, TEXT_DIM);
            y += PROP_ROW_H;
        }
    }
}

/// Draw a single line of left-aligned text inside `rect` with `color`.
unsafe fn draw_text_left(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    text: &str,
    rect: &RECT,
    color: u32,
) {
    unsafe {
        SetTextColor(hdc, windows::Win32::Foundation::COLORREF(rgb(color)));
        SetBkMode(hdc, TRANSPARENT);
        let mut buf: Vec<u16> = text.encode_utf16().collect();
        let mut r = *rect;
        let _ = DrawTextW(hdc, &mut buf, &mut r as *mut _, DT_SINGLELINE | DT_VCENTER);
    }
}

// ---------------------------------------------------------------------------
// Window state — per-window, stored in GWLP_USERDATA (no globals)
// ---------------------------------------------------------------------------

/// Per-window state for the main window. Holds the viewport child HWND
/// and the editor `Project` model. Stored in the parent's
/// `GWLP_USERDATA` (boxed) — idiomatic Win32 per-window state with no
/// global side effects (RULES.md "Avoid global side effects").
struct WindowState {
    child: Option<HWND>,
    project: Project,
    /// Index of the selected track in `project.scene.tracks` (UI state,
    /// kept out of the model). Used by M (toggle mute) + highlight.
    selected_track: usize,
    /// Whether playback is active (Spacebar toggles). When true, a
    /// `WM_TIMER` advances the playhead one frame per tick.
    playing: bool,
    /// Selected element: (track_index, element_index). Set by clicking a
    /// clip block. Used for Delete key + properties panel display.
    selected_element: Option<(usize, usize)>,
    /// Teleprompter text (Increment 5). When non-empty, the text scrolls
    /// vertically over the preview area based on the playhead position.
    /// Toggled/edited via Ctrl+P (opens a prompt dialog).
    teleprompter_text: String,
    /// Whether the teleprompter overlay is visible.
    teleprompter_on: bool,
}

/// Fetch the main window's `WindowState` from `GWLP_USERDATA`.
/// Returns `None` before the state is attached (white GDI fallback).
fn window_state(parent: HWND) -> Option<&'static WindowState> {
    unsafe {
        let raw = GetWindowLongPtrW(parent, GWLP_USERDATA) as *const WindowState;
        raw.as_ref()
    }
}

/// Fetch the main window's `WindowState` mutably.
fn window_state_mut(parent: HWND) -> Option<&'static mut WindowState> {
    unsafe {
        let raw = GetWindowLongPtrW(parent, GWLP_USERDATA) as *mut WindowState;
        raw.as_mut()
    }
}

/// Fetch the viewport child HWND from the main window's state.
fn child_hwnd(parent: HWND) -> Option<HWND> {
    window_state(parent).and_then(|s| s.child)
}

// ---------------------------------------------------------------------------
// Window procedures
// ---------------------------------------------------------------------------

fn last_error() -> Error {
    let code = unsafe { GetLastError() };
    Error::from_hresult(HRESULT::from_win32(code.0))
}

/// Show a simple modal MessageBox with the Artidor title. `error` =
/// true adds the error icon. Keeps the call sites short and consistent.
fn message_box(text: &str, error: bool) {
    let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    let flags = if error { MB_OK | MB_ICONERROR } else { MB_OK };
    unsafe {
        let _ = MessageBoxW(None, PCWSTR(wide.as_ptr()), w!("Artidor — Native"), flags);
    }
}

/// Fetch the per-window `Renderer` pointer stored in the child's
/// `GWLP_USERDATA` (separate slot from the parent's `WindowState`).
fn renderer_for(hwnd: HWND) -> Option<&'static mut Renderer> {
    unsafe {
        let raw = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *mut Renderer;
        raw.as_mut()
    }
}

/// Viewport child window proc: the D3D12 compositor presents here.
unsafe extern "system" fn viewport_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    unsafe {
        match msg {
            WM_ERASEBKGND => {
                // Compositor owns this surface; never let GDI erase it.
                LRESULT(1)
            }
            WM_PAINT => {
                if let Some(renderer) = renderer_for(hwnd) {
                    let w = client_width(hwnd);
                    let h = client_height(hwnd);
                    let _ = renderer.render(w, h);
                }
                let _ = ValidateRect(Some(hwnd), None);
                LRESULT(0)
            }
            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }
}

/// Main window proc: GDI chrome + layout + child viewport management.
unsafe extern "system" fn main_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    unsafe {
        match msg {
            WM_ERASEBKGND => {
                // Chrome paints the whole client in WM_PAINT; suppress the
                // class-background erase to avoid a white flash.
                LRESULT(1)
            }
            WM_PAINT => {
                let mut ps: PAINTSTRUCT = core::mem::zeroed();
                let hdc = BeginPaint(hwnd, &mut ps);
                let mut client = RECT::default();
                if GetClientRect(hwnd, &mut client).is_ok() {
                    let layout =
                        Layout::compute(client.right - client.left, client.bottom - client.top);
                    // Use the live project from window state if attached,
                    // else a throwaway default (white-GDI-fallback phase).
                    if let Some(state) = window_state(hwnd) {
                        paint_chrome(
                            hdc,
                            &layout,
                            &client,
                            &state.project,
                            state.selected_track,
                            state.playing,
                            state.selected_element,
                            &state.teleprompter_text,
                            state.teleprompter_on,
                        );
                    } else {
                        let fallback = Project::new_untitled("loading", 0);
                        paint_chrome(hdc, &layout, &client, &fallback, 0, false, None, "", false);
                    }
                }
                let _ = EndPaint(hwnd, &ps);
                LRESULT(0)
            }
            WM_SIZE => {
                // Reposition the viewport child to the preview rect and
                // repaint the chrome (borders shift on resize).
                let child = child_hwnd(hwnd);
                if let Some(child) = child {
                    let mut client = RECT::default();
                    if GetClientRect(hwnd, &mut client).is_ok() {
                        let layout =
                            Layout::compute(client.right - client.left, client.bottom - client.top);
                        let vw = (layout.viewport.right - layout.viewport.left).max(0);
                        let vh = (layout.viewport.bottom - layout.viewport.top).max(0);
                        let _ = MoveWindow(
                            child,
                            layout.viewport.left,
                            layout.viewport.top,
                            vw,
                            vh,
                            true,
                        );
                    }
                }
                let _ = InvalidateRect(Some(hwnd), None, false);
                LRESULT(0)
            }
            WM_KEYDOWN => {
                // Keyboard shortcuts (no text fields yet, so raw keys are
                // safe — no conflict with typing):
                //   \u{2190}\u{2192}  seek one frame back / forward
                //   \u{2191}\u{2193}  select previous / next track
                //   T     add a new track (cycles Video/Text/Audio/Graphic)
                //   M     toggle mute on the selected track
                // Wires `seek_relative_frame`, `add_track`,
                // `toggle_track_mute` (resolves their dead-code warnings).
                let key = wparam.0 as u16;
                let mut dirty = false;
                if let Some(state) = window_state_mut(hwnd) {
                    let track_count = state.project.scene.tracks.len();
                    match key {
                        k if k == VK_LEFT.0 => {
                            dirty = state.project.seek_relative_frame(-1).is_some();
                        }
                        k if k == VK_RIGHT.0 => {
                            dirty = state.project.seek_relative_frame(1).is_some();
                        }
                        k if k == VK_UP.0 && track_count > 0 => {
                            if state.selected_track > 0 {
                                state.selected_track -= 1;
                                dirty = true;
                            }
                        }
                        k if k == VK_DOWN.0 && track_count > 0 => {
                            if state.selected_track + 1 < track_count {
                                state.selected_track += 1;
                                dirty = true;
                            }
                        }
                        // 'T' = add a track, cycling through types.
                        0x54 => {
                            let types = [
                                TrackType::Video,
                                TrackType::Text,
                                TrackType::Audio,
                                TrackType::Graphic,
                            ];
                            let next_type = types[track_count % types.len()];
                            let id = format!("track-{}", track_count + 1);
                            let name = format!("{}", next_type.label());
                            state
                                .project
                                .add_track(state::Track::new(id, name, next_type));
                            state.selected_track = state.project.scene.tracks.len() - 1;
                            dirty = true;
                        }
                        // 'M' = toggle mute on the selected track.
                        0x4D if track_count > 0 => {
                            let sel = state.selected_track;
                            let track_id = state.project.scene.tracks[sel].id.clone();
                            let _ = state.project.toggle_track_mute(&track_id);
                            dirty = true;
                        }
                        // 'E' = add a test clip to the selected track
                        // (Increment 4d-4). Places a 5-second clip at
                        // the current playhead position. Lets the user
                        // see clip rendering without the full media
                        // import → element pipeline.
                        0x45 if track_count > 0 && GetKeyState(VK_CONTROL.0 as i32) >= 0 => {
                            let sel = state.selected_track;
                            let track_id = state.project.scene.tracks[sel].id.clone();
                            let start = state.project.playhead.as_seconds();
                            let el_count = state.project.scene.tracks[sel].elements.len();
                            let el = state::Element::new(
                                format!("el-{}", el_count + 1),
                                format!("Clip {}", el_count + 1),
                                start,
                                5.0,
                            );
                            let _ = state.project.add_element(&track_id, el);
                            dirty = true;
                        }
                        // Spacebar = toggle playback (Increment 4e).
                        // When playing, a WM_TIMER advances the playhead
                        // one frame per tick at the project's fps. When
                        // paused, the timer is killed. At end of timeline,
                        // playback stops and the playhead wraps to 0.
                        0x20 => {
                            if state.playing {
                                state.playing = false;
                                let _ = KillTimer(Some(hwnd), PLAYBACK_TIMER_ID);
                            } else {
                                // If at the end, wrap to start before playing.
                                let duration = timeline_duration(&state.project);
                                if state.project.playhead.as_seconds() >= duration {
                                    let _ = state.project.seek_seconds(0.0);
                                }
                                state.playing = true;
                                let fps = state.project.settings.fps;
                                let interval_ms = 1000 / (fps.numerator / fps.denominator).max(1);
                                let _ = SetTimer(Some(hwnd), PLAYBACK_TIMER_ID, interval_ms, None);
                            }
                            dirty = true;
                        }
                        // Delete = remove the selected clip (Increment 4f).
                        k if k == VK_DELETE.0 => {
                            if let Some((ti, ei)) = state.selected_element {
                                if ti < state.project.scene.tracks.len() {
                                    let track_id = state.project.scene.tracks[ti].id.clone();
                                    if ei < state.project.scene.tracks[ti].elements.len() {
                                        let element_id =
                                            state.project.scene.tracks[ti].elements[ei].id.clone();
                                        state.project.remove_element(&track_id, &element_id);
                                        state.selected_element = None;
                                        dirty = true;
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                }
                // Ctrl+S = save project via a native "Save As" dialog
                // (Increment 6c: replaces the fixed-cwd path from 6a).
                // The suggested filename is `<id>.artpr.json`.
                if key == 0x53 && GetKeyState(VK_CONTROL.0 as i32) < 0 {
                    if let Some(state) = window_state_mut(hwnd) {
                        let default_name =
                            format!("{}.{}", state.project.metadata.id, persist::PROJECT_EXT);
                        let filters = [dialogs::Filter {
                            label: "Artidor project (*.artpr.json)",
                            extensions: "*.artpr.json",
                        }];
                        match dialogs::save_dialog(
                            hwnd,
                            "Save Artidor Project",
                            &filters,
                            "artpr.json",
                            &default_name,
                        ) {
                            Ok(Some(path)) => match persist::save_project(&path, &state.project) {
                                Ok(()) => {
                                    let msg = format!("Saved project to:\n\n{}", path.display());
                                    message_box(&msg, false);
                                }
                                Err(e) => {
                                    let msg = format!("Failed to save project:\n\n{e}");
                                    message_box(&msg, true);
                                }
                            },
                            Ok(None) => {} // user cancelled — no action
                            Err(e) => {
                                let msg = format!("Save dialog error:\n\n{e}");
                                message_box(&msg, true);
                            }
                        }
                    }
                }
                // Ctrl+O = open a project file via a native "Open" dialog
                // (Increment 6c). Loads the project and replaces the
                // editor state. The playhead resets to the start.
                if key == 0x4F && GetKeyState(VK_CONTROL.0 as i32) < 0 {
                    let filters = [dialogs::Filter {
                        label: "Artidor project (*.artpr.json)",
                        extensions: "*.artpr.json",
                    }];
                    match dialogs::open_dialog(hwnd, "Open Artidor Project", &filters) {
                        Ok(Some(path)) => match persist::load_project(&path) {
                            Ok(project) => {
                                if let Some(state) = window_state_mut(hwnd) {
                                    state.project = project;
                                    state.selected_track = 0;
                                    dirty = true;
                                }
                                let msg = format!("Opened project:\n\n{}", path.display());
                                message_box(&msg, false);
                            }
                            Err(e) => {
                                let msg = format!("Failed to open project:\n\n{e}");
                                message_box(&msg, true);
                            }
                        },
                        Ok(None) => {} // user cancelled
                        Err(e) => {
                            let msg = format!("Open dialog error:\n\n{e}");
                            message_box(&msg, true);
                        }
                    }
                }
                // Ctrl+I = import a media file via a native "Open" dialog
                // (Increment 6c). The file path is stored as a `MediaAsset`
                // in the project — the native shell reads from disk via
                // `std::fs` (no blob URLs, unlike the web app). The asset
                // list renders in the tools panel.
                if key == 0x49 && GetKeyState(VK_CONTROL.0 as i32) < 0 {
                    let filters = [
                        dialogs::Filter {
                            label: "Media files (*.png;*.jpg;*.mp4;*.mp3;...)",
                            extensions: "*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp;*.svg;*.mp4;*.mov;*.webm;*.avi;*.mkv;*.mp3;*.wav;*.aac;*.flac;*.ogg",
                        },
                        dialogs::Filter {
                            label: "All files (*.*)",
                            extensions: "*.*",
                        },
                    ];
                    match dialogs::open_dialog(hwnd, "Import Media", &filters) {
                        Ok(Some(path)) => {
                            if let Some(state) = window_state_mut(hwnd) {
                                let asset_id = format!("asset-{}", state.project.assets.len() + 1);
                                let asset = state::MediaAsset::from_path(&asset_id, &path);
                                state.project.add_asset(asset);
                                dirty = true;
                                let msg = format!(
                                    "Imported media:\n\n{}\n\nAdded to project assets.",
                                    path.display()
                                );
                                message_box(&msg, false);
                            }
                        }
                        Ok(None) => {} // user cancelled
                        Err(e) => {
                            let msg = format!("Import dialog error:\n\n{e}");
                            message_box(&msg, true);
                        }
                    }
                }
                // Ctrl+R = rename the project via a native text-input
                // dialog (Increment 4d-1). Wires `Project::rename`,
                // resolving its dead-code warning. The dialog is modal
                // and pre-filled with the current project name.
                if key == 0x52 && GetKeyState(VK_CONTROL.0 as i32) < 0 {
                    if let Some(state) = window_state(hwnd) {
                        let current_name = state.project.metadata.name.clone();
                        match dialogs::prompt_dialog(
                            hwnd,
                            "Rename Project",
                            "Project name:",
                            &current_name,
                        ) {
                            Ok(Some(new_name)) => {
                                let now_ms = std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .map(|d| d.as_millis() as i64)
                                    .unwrap_or(0);
                                if let Some(state) = window_state_mut(hwnd) {
                                    if state.project.rename(&new_name, now_ms) {
                                        dirty = true;
                                    } else {
                                        let msg = "Name cannot be empty or whitespace-only.";
                                        message_box(msg, true);
                                    }
                                }
                            }
                            Ok(None) => {} // user cancelled
                            Err(e) => {
                                let msg = format!("Rename dialog error:\n\n{e}");
                                message_box(&msg, true);
                            }
                        }
                    }
                }
                // Ctrl+P = teleprompter (Increment 5). Opens a prompt
                // dialog to enter scrolling text. If text is already set,
                // pre-fills it. Empty text disables the overlay. The
                // overlay scrolls the text vertically over the preview
                // based on the playhead position.
                if key == 0x50 && GetKeyState(VK_CONTROL.0 as i32) < 0 {
                    if let Some(state) = window_state(hwnd) {
                        let current_text = state.teleprompter_text.clone();
                        match dialogs::prompt_dialog(
                            hwnd,
                            "Teleprompter",
                            "Scrolling text (empty = off):",
                            &current_text,
                        ) {
                            Ok(Some(new_text)) => {
                                if let Some(state) = window_state_mut(hwnd) {
                                    let trimmed = new_text.trim();
                                    if trimmed.is_empty() {
                                        state.teleprompter_text.clear();
                                        state.teleprompter_on = false;
                                    } else {
                                        state.teleprompter_text = new_text;
                                        state.teleprompter_on = true;
                                    }
                                    dirty = true;
                                }
                            }
                            Ok(None) => {} // user cancelled
                            Err(e) => {
                                let msg = format!("Teleprompter dialog error:\n\n{e}");
                                message_box(&msg, true);
                            }
                        }
                    }
                }
                // Ctrl+E = export a short proof clip via the top-1 native
                // FFmpeg pipeline (Increment 6b). 30 frames @ 30fps = 1s.
                // Increment 6c: the output path now comes from a native
                // "Save As" dialog (replaces the fixed-cwd path). Real
                // export computes frame_count from the timeline duration
                // once elements exist.
                if key == 0x45 && GetKeyState(VK_CONTROL.0 as i32) < 0 {
                    if let (Some(state), Some(child)) = (window_state(hwnd), child_hwnd(hwnd)) {
                        if let Some(renderer) = renderer_for(child) {
                            let default_name = format!("{}-export.mp4", state.project.metadata.id);
                            let filters = [
                                dialogs::Filter {
                                    label: "MP4 video (*.mp4)",
                                    extensions: "*.mp4",
                                },
                                dialogs::Filter {
                                    label: "All files (*.*)",
                                    extensions: "*.*",
                                },
                            ];
                            match dialogs::save_dialog(
                                hwnd,
                                "Export Video",
                                &filters,
                                "mp4",
                                &default_name,
                            ) {
                                Ok(Some(path)) => {
                                    // Clone the project so the shared borrow
                                    // of `state` ends before we mutably
                                    // borrow the renderer (no aliasing).
                                    let project = state.project.clone();
                                    let opts =
                                        export::ExportOptions::from_project(&project, &path, 30);
                                    match renderer.export_video(&project, &opts) {
                                        Ok(out) => {
                                            let msg = format!(
                                                "Exported video to:\n\n{}\n\n(top-1 native FFmpeg pipeline)",
                                                out.display()
                                            );
                                            message_box(&msg, false);
                                        }
                                        Err(e) => {
                                            let msg = format!(
                                                "Export failed:\n\n{e}\n\n(Is ffmpeg installed or bundled?)"
                                            );
                                            message_box(&msg, true);
                                        }
                                    }
                                }
                                Ok(None) => {} // user cancelled
                                Err(e) => {
                                    let msg = format!("Export dialog error:\n\n{e}");
                                    message_box(&msg, true);
                                }
                            }
                        }
                    }
                }
                if dirty {
                    let _ = InvalidateRect(Some(hwnd), None, false);
                }
                LRESULT(0)
            }
            WM_LBUTTONDOWN => {
                // Click on the timeline panel (Increment 4d-2 + 4f).
                // First check if the click hits a clip block → select it.
                // Otherwise, fall back to click-to-seek.
                let x = (lparam.0 & 0xFFFF) as i16 as i32;
                let y = ((lparam.0 >> 16) & 0xFFFF) as i16 as i32;
                if let Some(state) = window_state_mut(hwnd) {
                    let mut client = RECT::default();
                    if GetClientRect(hwnd, &mut client).is_ok() {
                        let layout =
                            Layout::compute(client.right - client.left, client.bottom - client.top);
                        let tl = &layout.timeline;
                        let readout_h = 22;
                        let list_bottom = tl.bottom - readout_h;
                        let panel_w = tl.right - tl.left;
                        let duration = timeline_duration(&state.project);

                        // Step 1: check if the click hits a clip block.
                        // Clip blocks are in the area right of the 140px
                        // header on each track row.
                        let mut clicked_clip: Option<(usize, usize)> = None;
                        if duration > 0.0 && y >= tl.top && y <= list_bottom {
                            let mut row_y = tl.top + TRACK_PAD;
                            for (ti, track) in state.project.scene.tracks.iter().enumerate() {
                                if row_y + TRACK_ROW_H > list_bottom {
                                    break;
                                }
                                let row_top = row_y;
                                let row_bottom = row_y + TRACK_ROW_H - 2;
                                let header_right = tl.left + TRACK_PAD + 140;
                                let clip_area_left = header_right + 4;
                                let clip_area_right = tl.left + panel_w - TRACK_PAD - 4;
                                let clip_area_w = (clip_area_right - clip_area_left).max(1) as f64;
                                if y >= row_top && y <= row_bottom {
                                    for (ei, element) in track.elements.iter().enumerate() {
                                        let start_frac =
                                            (element.start_seconds / duration).clamp(0.0, 1.0);
                                        let end_frac =
                                            (element.end_seconds() / duration).clamp(0.0, 1.0);
                                        let clip_x =
                                            clip_area_left + (start_frac * clip_area_w) as i32;
                                        let clip_w = ((end_frac - start_frac) * clip_area_w) as i32;
                                        if x >= clip_x && x <= clip_x + clip_w.max(2) {
                                            clicked_clip = Some((ti, ei));
                                            break;
                                        }
                                    }
                                    break; // found the row
                                }
                                row_y += TRACK_ROW_H;
                            }
                        }

                        if let Some((ti, ei)) = clicked_clip {
                            state.selected_element = Some((ti, ei));
                            state.selected_track = ti;
                            let _ = InvalidateRect(Some(hwnd), None, false);
                        } else if x >= tl.left + TRACK_PAD
                            && x <= tl.right - TRACK_PAD
                            && y >= tl.top
                            && y <= list_bottom
                        {
                            // Step 2: click-to-seek (no clip was hit).
                            state.selected_element = None; // deselect
                            if duration > 0.0 {
                                let track_area_left = tl.left + TRACK_PAD;
                                let track_area_right = tl.right - TRACK_PAD;
                                let track_area_w =
                                    (track_area_right - track_area_left).max(1) as f64;
                                let frac =
                                    ((x - track_area_left) as f64 / track_area_w).clamp(0.0, 1.0);
                                let seconds = frac * duration;
                                if state.project.seek_seconds(seconds) {
                                    let _ = InvalidateRect(Some(hwnd), None, false);
                                }
                            }
                        }
                    }
                }
                LRESULT(0)
            }
            WM_TIMER => {
                // Playback timer tick (Increment 4e). Advance the
                // playhead by one frame. Stop at the end of the timeline
                // (wrap to 0 and pause). Repaint to show the new position.
                if wparam.0 == PLAYBACK_TIMER_ID {
                    if let Some(state) = window_state_mut(hwnd) {
                        if state.playing {
                            let duration = timeline_duration(&state.project);
                            let current = state.project.playhead.as_seconds();
                            if current >= duration {
                                // End of timeline: wrap to start and pause.
                                state.playing = false;
                                let _ = KillTimer(Some(hwnd), PLAYBACK_TIMER_ID);
                                let _ = state.project.seek_seconds(0.0);
                            } else {
                                // Advance one frame at the project's fps.
                                let _ = state.project.seek_relative_frame(1);
                            }
                            let _ = InvalidateRect(Some(hwnd), None, false);
                        }
                    }
                }
                LRESULT(0)
            }
            WM_DESTROY => {
                // Kill the playback timer if active (cleanup).
                let _ = KillTimer(Some(hwnd), PLAYBACK_TIMER_ID);
                // Destroy the child first so the compositor surface
                // (created from the child HWND) is dropped while the
                // child window is still valid — required by the wgpu
                // surface safety contract. Then drop the window state
                // (which also clears the child slot).
                let raw = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *mut WindowState;
                if !raw.is_null() {
                    SetWindowLongPtrW(hwnd, GWLP_USERDATA, 0);
                    let state = Box::from_raw(raw);
                    if let Some(child) = state.child {
                        let _ = DestroyWindow(child);
                    }
                    drop(state);
                }
                PostQuitMessage(0);
                LRESULT(0)
            }
            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }
}

fn client_width(hwnd: HWND) -> u32 {
    let mut rect = RECT::default();
    match unsafe { GetClientRect(hwnd, &mut rect) } {
        Ok(()) => (rect.right - rect.left).max(0) as u32,
        Err(_) => 0,
    }
}

fn client_height(hwnd: HWND) -> u32 {
    let mut rect = RECT::default();
    match unsafe { GetClientRect(hwnd, &mut rect) } {
        Ok(()) => (rect.bottom - rect.top).max(0) as u32,
        Err(_) => 0,
    }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

fn main() -> Result<(), Error> {
    unsafe {
        let hinstance: HINSTANCE = GetModuleHandleW(None)?.into();

        // Register both window classes.
        let main_wc = WNDCLASSW {
            style: CS_HREDRAW | CS_VREDRAW,
            lpfnWndProc: Some(main_proc),
            hInstance: hinstance,
            hCursor: LoadCursorW(None, IDC_ARROW)?,
            hbrBackground: HBRUSH(((COLOR_WINDOW.0 + 1) as usize) as *mut core::ffi::c_void),
            lpszClassName: CLASS_NAME,
            ..core::mem::zeroed()
        };
        if RegisterClassW(&main_wc) == 0 {
            return Err(last_error());
        }
        let child_wc = WNDCLASSW {
            style: CS_HREDRAW | CS_VREDRAW,
            lpfnWndProc: Some(viewport_proc),
            hInstance: hinstance,
            hCursor: LoadCursorW(None, IDC_ARROW)?,
            hbrBackground: HBRUSH(((COLOR_WINDOW.0 + 1) as usize) as *mut core::ffi::c_void),
            lpszClassName: CHILD_CLASS_NAME,
            ..core::mem::zeroed()
        };
        if RegisterClassW(&child_wc) == 0 {
            return Err(last_error());
        }

        let hwnd = CreateWindowExW(
            WINDOW_EX_STYLE::default(),
            CLASS_NAME,
            WINDOW_TITLE,
            WS_OVERLAPPEDWINDOW | WS_CLIPCHILDREN,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            WINDOW_WIDTH,
            WINDOW_HEIGHT,
            None,
            None,
            Some(hinstance),
            None,
        )?;

        // Create the viewport child window at the default preview rect.
        let mut client = RECT::default();
        let _ = GetClientRect(hwnd, &mut client);
        let layout = Layout::compute(client.right - client.left, client.bottom - client.top);
        let vw = (layout.viewport.right - layout.viewport.left).max(1);
        let vh = (layout.viewport.bottom - layout.viewport.top).max(1);
        let child = CreateWindowExW(
            WINDOW_EX_STYLE::default(),
            CHILD_CLASS_NAME,
            w!(""),
            WS_CHILD | WS_VISIBLE | WS_CLIPCHILDREN,
            layout.viewport.left,
            layout.viewport.top,
            vw,
            vh,
            Some(hwnd),
            None,
            Some(hinstance),
            None,
        )?;

        // Attach the per-window state to the parent: the editor project
        // model + the viewport child HWND. Stored boxed in GWLP_USERDATA
        // (no globals). The project is seeded as an untitled project.
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);
        let project = Project::new_untitled("untitled", now_ms);
        let state = Box::new(WindowState {
            child: Some(child),
            project,
            selected_track: 0,
            playing: false,
            selected_element: None,
            teleprompter_text: String::new(),
            teleprompter_on: false,
        });
        SetWindowLongPtrW(hwnd, GWLP_USERDATA, Box::into_raw(state) as isize);

        let _ = ShowWindow(hwnd, SW_SHOW);
        let _ = ShowWindow(child, SW_SHOW);
        if UpdateWindow(hwnd).0 == 0 {
            return Err(last_error());
        }

        // Initialise the native WGPU/D3D12 compositor on the child HWND.
        match Renderer::new(child) {
            Ok(renderer) => {
                let boxed = Box::new(renderer);
                SetWindowLongPtrW(child, GWLP_USERDATA, Box::into_raw(boxed) as isize);
                let _ = InvalidateRect(Some(child), None, false);
            }
            Err(e) => {
                let msg = format!("Artidor native compositor init failed:\n\n{e}");
                let wide: Vec<u16> = msg.encode_utf16().chain(std::iter::once(0)).collect();
                let _ = MessageBoxW(
                    None,
                    PCWSTR(wide.as_ptr()),
                    w!("Artidor — Native"),
                    MB_OK | MB_ICONERROR,
                );
            }
        }

        let mut msg: MSG = core::mem::zeroed();
        loop {
            let r = GetMessageW(&mut msg, None, 0, 0);
            if r.0 == 0 {
                break;
            }
            if r.0 == -1 {
                return Err(last_error());
            }
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        Ok(())
    }
}
