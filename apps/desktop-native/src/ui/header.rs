//! Header bar — project name, zoom, and action buttons.
//!
//! Mirrors `apps/desktop-web/src/ui/header.rs` and web `editor-header.tsx`:
//! - Left: logo + project name capsule
//! - Center: zoom capsule (pps display)
//! - Right: settings + export + window controls (— □ ✕)
//!
//! Window controls (minimize, maximize, close) are drawn as clickable
//! rects. The export button triggers Ctrl+E. Settings triggers Ctrl+,.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{BG, BG_DARK, BORDER, BORDER_FAINT, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT};
use crate::ui::gfx::{border_rect, draw_text_centered, draw_text_left, fill_rect};

/// Button rects for hit-testing (stored in WindowState via HeaderButtons).
#[derive(Clone, Copy, Default)]
pub struct HeaderButtons {
    pub minimize: RECT,
    pub maximize: RECT,
    pub close: RECT,
    pub export_btn: RECT,
    pub settings_btn: RECT,
}

/// Draw the header bar: logo + project name (left), zoom capsule (center),
/// settings + export + window controls (right).
pub unsafe fn draw_header(
    hdc: HDC,
    rect: &RECT,
    project: &Project,
    zoom_pps: f64,
    btns: &mut HeaderButtons,
) {
    unsafe {
        fill_rect(hdc, rect, BG);
        border_rect(hdc, rect, BORDER);

        let h = rect.bottom - rect.top;
        let w = rect.right - rect.left;

        // --- Left: logo + project name capsule ---
        let logo_rect = RECT {
            left: rect.left + 16,
            top: rect.top + 8,
            right: rect.left + 36,
            bottom: rect.bottom - 8,
        };
        fill_rect(hdc, &logo_rect, 0x2A3F8C); // brand blue
        draw_text_centered(hdc, "A", &logo_rect, 0xFFFFFF);

        // Project name capsule.
        let name = &project.metadata.name;
        let name_rect = RECT {
            left: logo_rect.right + 8,
            top: rect.top + 8,
            right: logo_rect.right + 8 + 160,
            bottom: rect.bottom - 8,
        };
        fill_rect(hdc, &name_rect, BG_DARK);
        border_rect(hdc, &name_rect, BORDER_FAINT);
        draw_text_left(
            hdc,
            name,
            &RECT {
                left: name_rect.left + 8,
                top: name_rect.top,
                right: name_rect.right - 8,
                bottom: name_rect.bottom,
            },
            TEXT_BRIGHT,
        );

        // --- Center: zoom capsule (absolute-centered) ---
        let zoom_label = format!("{:.0} px/s", zoom_pps);
        let zoom_w = 80;
        let zoom_rect = RECT {
            left: rect.left + (w - zoom_w) / 2,
            top: rect.top + 8,
            right: rect.left + (w + zoom_w) / 2,
            bottom: rect.bottom - 8,
        };
        fill_rect(hdc, &zoom_rect, BG_DARK);
        border_rect(hdc, &zoom_rect, BORDER_FAINT);
        draw_text_centered(hdc, &zoom_label, &zoom_rect, TEXT_DIM);

        // --- Right: settings + export + window controls ---
        let btn_h = h - 16;
        let mut rx = rect.right - 16;

        // Window controls: close (✕), maximize (□), minimize (—) — right to left.
        let wc_w = 36;
        btns.close = RECT {
            left: rx - wc_w,
            top: rect.top + 8,
            right: rx,
            bottom: rect.bottom - 8,
        };
        fill_rect(hdc, &btns.close, 0xC42B1C); // red
        draw_text_centered(hdc, "\u{2715}", &btns.close, 0xFFFFFF);
        rx -= wc_w;

        btns.maximize = RECT {
            left: rx - wc_w,
            top: rect.top + 8,
            right: rx,
            bottom: rect.bottom - 8,
        };
        fill_rect(hdc, &btns.maximize, BG_DARK);
        border_rect(hdc, &btns.maximize, BORDER_FAINT);
        draw_text_centered(hdc, "\u{25A1}", &btns.maximize, TEXT_DIM);
        rx -= wc_w;

        btns.minimize = RECT {
            left: rx - wc_w,
            top: rect.top + 8,
            right: rx,
            bottom: rect.bottom - 8,
        };
        fill_rect(hdc, &btns.minimize, BG_DARK);
        border_rect(hdc, &btns.minimize, BORDER_FAINT);
        draw_text_centered(hdc, "\u{2014}", &btns.minimize, TEXT_DIM);
        rx -= wc_w + 8;

        // Export button.
        let export_w = 64;
        btns.export_btn = RECT {
            left: rx - export_w,
            top: rect.top + 8,
            right: rx,
            bottom: rect.top + 8 + btn_h,
        };
        fill_rect(hdc, &btns.export_btn, 0x2A3F8C);
        draw_text_centered(hdc, "Export", &btns.export_btn, 0xFFFFFF);
        rx -= export_w + 8;

        // Settings button (gear icon).
        let settings_w = 32;
        btns.settings_btn = RECT {
            left: rx - settings_w,
            top: rect.top + 8,
            right: rx,
            bottom: rect.top + 8 + btn_h,
        };
        fill_rect(hdc, &btns.settings_btn, BG_DARK);
        border_rect(hdc, &btns.settings_btn, BORDER_FAINT);
        draw_text_centered(hdc, "\u{2699}", &btns.settings_btn, TEXT_DIM);
    }
}
