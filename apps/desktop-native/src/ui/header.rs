//! Header bar — project name, zoom, and action buttons.
//!
//! Mirrors `apps/web/src/components/editor/editor-header.tsx`:
//! - Left: brand logo + identity pod capsule (project name + breadcrumbs)
//! - Center: zoom capsule (rounded, subtle background)
//! - Right: cloud status, layout presets, settings, share, export action hub
//!
//! Window controls are intentionally omitted — the native OS chrome already
//! provides minimize/maximize/close, so drawing fake ones inside the app
//! header would not match the web design.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{
    ACCENT_SUBTLE, BG, BG_DARK, BLUE, BORDER_FAINT, BORDER_TOP, TEXT_DIM, TEXT_FAINT, TEXT_MUTED,
};
use crate::ui::gfx::{
    draw_hline, draw_text_centered, draw_text_left, gradient_fill_v, rounded_border_rect,
    rounded_fill_rect,
};

/// Button rects for hit-testing (stored in `WindowState` via `HeaderButtons`).
/// Window-control fields are kept as zero-sized rects so existing hit-test
/// code in `window/shortcuts.rs` does not need to change.
#[derive(Clone, Copy, Default)]
pub struct HeaderButtons {
    pub minimize: RECT,
    pub maximize: RECT,
    pub close: RECT,
    pub export_btn: RECT,
    pub settings_btn: RECT,
    pub share_btn: RECT,
    pub layout_btn: RECT,
    pub cloud_btn: RECT,
}

/// Draw the header bar: gradient background, hairline, left identity pod,
/// center zoom capsule, and right action hub.
pub unsafe fn draw_header(
    hdc: HDC,
    rect: &RECT,
    project: &Project,
    zoom_pps: f64,
    btns: &mut HeaderButtons,
) {
    unsafe {
        let w = rect.right - rect.left;

        // Subtle gradient header background.
        gradient_fill_v(hdc, rect, BG, BG_DARK);

        // Top hairline: `bg-gradient-to-r from-transparent via-white/10 to-transparent`.
        // Rendered as a centred 1px highlight strip.
        draw_hline(
            hdc,
            rect.left + w / 6,
            rect.right - w / 6,
            rect.top,
            BORDER_TOP,
        );

        // Zero out the legacy window-control rects so old hit-test code never
        // triggers them; we keep the fields to avoid changing the struct layout.
        btns.minimize = RECT::default();
        btns.maximize = RECT::default();
        btns.close = RECT::default();

        // --- Left: brand logo + identity pod capsule ---
        let logo_size = 24;
        let logo_rect = RECT {
            left: rect.left + 16,
            top: rect.top + (rect.bottom - rect.top - logo_size) / 2,
            right: rect.left + 16 + logo_size,
            bottom: rect.top + (rect.bottom - rect.top - logo_size) / 2 + logo_size,
        };
        // Small rounded-square brand mark (blue, white "A").
        rounded_fill_rect(hdc, &logo_rect, BLUE, 6);
        draw_text_centered(hdc, "A", &logo_rect, 0xFFFFFF);

        // Identity pod: "Projects / {name}" inside a rounded capsule.
        let name = &project.metadata.name;
        let pod_w = 180;
        let pod_h = 28;
        let pod_rect = RECT {
            left: logo_rect.right + 10,
            top: rect.top + (rect.bottom - rect.top - pod_h) / 2,
            right: logo_rect.right + 10 + pod_w,
            bottom: rect.top + (rect.bottom - rect.top - pod_h) / 2 + pod_h,
        };
        rounded_fill_rect(hdc, &pod_rect, ACCENT_SUBTLE, 14);
        rounded_border_rect(hdc, &pod_rect, BORDER_FAINT, 14);

        let breadcrumb = format!("PROJECTS  /  {name}");
        let label_rect = RECT {
            left: pod_rect.left + 10,
            top: pod_rect.top,
            right: pod_rect.right - 10,
            bottom: pod_rect.bottom,
        };
        draw_text_left(hdc, &breadcrumb, &label_rect, TEXT_MUTED);

        // --- Center: zoom capsule ---
        let zoom_label = format!("{:.0} px/s", zoom_pps);
        let zoom_w = 80;
        let zoom_h = 28;
        let zoom_rect = RECT {
            left: rect.left + (w - zoom_w) / 2,
            top: rect.top + (rect.bottom - rect.top - zoom_h) / 2,
            right: rect.left + (w + zoom_w) / 2,
            bottom: rect.top + (rect.bottom - rect.top - zoom_h) / 2 + zoom_h,
        };
        rounded_fill_rect(hdc, &zoom_rect, ACCENT_SUBTLE, 14);
        rounded_border_rect(hdc, &zoom_rect, BORDER_FAINT, 14);
        draw_text_centered(hdc, &zoom_label, &zoom_rect, TEXT_DIM);

        // --- Right: action hub ---
        let mut rx = rect.right - 16;
        let btn_h = 28;
        let gap = 6;

        // Export button (primary blue).
        let export_w = 64;
        btns.export_btn = RECT {
            left: rx - export_w,
            top: rect.top + (rect.bottom - rect.top - btn_h) / 2,
            right: rx,
            bottom: rect.top + (rect.bottom - rect.top - btn_h) / 2 + btn_h,
        };
        rounded_fill_rect(hdc, &btns.export_btn, BLUE, 14);
        draw_text_centered(hdc, "Export", &btns.export_btn, 0xFFFFFF);
        rx -= export_w + gap;

        // Share button.
        let share_w = 52;
        btns.share_btn = RECT {
            left: rx - share_w,
            top: rect.top + (rect.bottom - rect.top - btn_h) / 2,
            right: rx,
            bottom: rect.top + (rect.bottom - rect.top - btn_h) / 2 + btn_h,
        };
        rounded_fill_rect(hdc, &btns.share_btn, ACCENT_SUBTLE, 14);
        rounded_border_rect(hdc, &btns.share_btn, BORDER_FAINT, 14);
        draw_text_centered(hdc, "Share", &btns.share_btn, TEXT_DIM);
        rx -= share_w + gap;

        // Settings button.
        let settings_w = 56;
        btns.settings_btn = RECT {
            left: rx - settings_w,
            top: rect.top + (rect.bottom - rect.top - btn_h) / 2,
            right: rx,
            bottom: rect.top + (rect.bottom - rect.top - btn_h) / 2 + btn_h,
        };
        rounded_fill_rect(hdc, &btns.settings_btn, ACCENT_SUBTLE, 14);
        rounded_border_rect(hdc, &btns.settings_btn, BORDER_FAINT, 14);
        draw_text_centered(hdc, "Settings", &btns.settings_btn, TEXT_DIM);
        rx -= settings_w + gap;

        // Layout presets button.
        let layout_w = 44;
        btns.layout_btn = RECT {
            left: rx - layout_w,
            top: rect.top + (rect.bottom - rect.top - btn_h) / 2,
            right: rx,
            bottom: rect.top + (rect.bottom - rect.top - btn_h) / 2 + btn_h,
        };
        rounded_fill_rect(hdc, &btns.layout_btn, ACCENT_SUBTLE, 14);
        rounded_border_rect(hdc, &btns.layout_btn, BORDER_FAINT, 14);
        draw_text_centered(hdc, "Layout", &btns.layout_btn, TEXT_FAINT);
        rx -= layout_w + gap;

        // Cloud status button.
        let cloud_w = 48;
        btns.cloud_btn = RECT {
            left: rx - cloud_w,
            top: rect.top + (rect.bottom - rect.top - btn_h) / 2,
            right: rx,
            bottom: rect.top + (rect.bottom - rect.top - btn_h) / 2 + btn_h,
        };
        rounded_fill_rect(hdc, &btns.cloud_btn, ACCENT_SUBTLE, 14);
        rounded_border_rect(hdc, &btns.cloud_btn, BORDER_FAINT, 14);
        draw_text_centered(hdc, "Local", &btns.cloud_btn, TEXT_FAINT);
    }
}
