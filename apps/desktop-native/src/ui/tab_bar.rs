//! Vertical tab bar — the 72px-wide icon rail on the far left.
//!
//! Mirrors `apps/web/src/components/editor/panels/assets/tabbar.tsx`:
//! a glass column of icon+label buttons that switch the assets panel's
//! active view, plus a storage card at the bottom.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::AssetsTab;
use crate::theme::{
    ACCENT_BG, ACCENT_SUBTLE, BORDER, BORDER_FAINT, PANEL_BG, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT,
    TEXT_MUTED,
};
use crate::ui::gfx::{border_rect, draw_text_centered, fill_rect};

/// Tab button height (matches web ~31px).
const TAB_BTN_H: i32 = 32;
/// Storage card height at the bottom.
const STORAGE_CARD_H: i32 = 64;

/// Draw the tab bar rail: all tab buttons + storage card at bottom.
/// Stores tab button rects in `tab_rects` for click hit-testing.
pub unsafe fn draw_tab_bar(hdc: HDC, rect: &RECT, active: AssetsTab, tab_rects: &mut Vec<RECT>) {
    unsafe {
        // Glass panel background.
        fill_rect(hdc, rect, PANEL_BG);
        border_rect(hdc, rect, BORDER);

        tab_rects.clear();
        let pad = 6;
        let mut y = rect.top + 8;
        let btn_w = rect.right - rect.left - 2 * pad;

        for &tab in AssetsTab::ALL {
            if y + TAB_BTN_H > rect.bottom - STORAGE_CARD_H - 6 {
                break;
            }
            let btn_rect = RECT {
                left: rect.left + pad,
                top: y,
                right: rect.left + pad + btn_w,
                bottom: y + TAB_BTN_H,
            };
            tab_rects.push(btn_rect);

            let is_active = tab == active;
            let bg = if is_active { ACCENT_BG } else { PANEL_BG };
            fill_rect(hdc, &btn_rect, bg);
            if is_active {
                border_rect(hdc, &btn_rect, BORDER_FAINT);
            }

            // Glyph (icon) area.
            let glyph_rect = RECT {
                left: btn_rect.left,
                top: btn_rect.top + 3,
                right: btn_rect.right,
                bottom: btn_rect.top + 18,
            };
            let glyph_color = if is_active { TEXT_BRIGHT } else { TEXT_DIM };
            draw_text_centered(hdc, tab.glyph(), &glyph_rect, glyph_color);

            // Label (tiny text under icon).
            let label_rect = RECT {
                left: btn_rect.left,
                top: btn_rect.top + 17,
                right: btn_rect.right,
                bottom: btn_rect.bottom - 1,
            };
            let label_color = if is_active { TEXT_MUTED } else { TEXT_FAINT };
            draw_text_centered(hdc, tab.label(), &label_rect, label_color);

            y += TAB_BTN_H + 2;
        }

        // Storage card at the bottom.
        let card_rect = RECT {
            left: rect.left + pad,
            top: rect.bottom - STORAGE_CARD_H,
            right: rect.right - pad,
            bottom: rect.bottom - 6,
        };
        fill_rect(hdc, &card_rect, PANEL_BG);
        border_rect(hdc, &card_rect, BORDER_FAINT);

        // "Used" label + storage info.
        let used_label = "0 B";
        let used_rect = RECT {
            left: card_rect.left + 4,
            top: card_rect.top + 6,
            right: card_rect.right - 4,
            bottom: card_rect.top + 22,
        };
        draw_text_centered(hdc, used_label, &used_rect, TEXT_BRIGHT);

        let info_rect = RECT {
            left: card_rect.left + 4,
            top: card_rect.top + 20,
            right: card_rect.right - 4,
            bottom: card_rect.top + 34,
        };
        draw_text_centered(hdc, "Used", &info_rect, TEXT_FAINT);

        // Thin progress bar.
        let bar_y = card_rect.top + 40;
        let bar_h = 4;
        let bar_rect = RECT {
            left: card_rect.left + 8,
            top: bar_y,
            right: card_rect.right - 8,
            bottom: bar_y + bar_h,
        };
        fill_rect(hdc, &bar_rect, ACCENT_SUBTLE);
        let fill_rect_inner = RECT {
            left: bar_rect.left,
            top: bar_rect.top,
            right: bar_rect.left + (bar_rect.right - bar_rect.left) / 10,
            bottom: bar_rect.bottom,
        };
        fill_rect(hdc, &fill_rect_inner, TEXT_MUTED);
    }
}
