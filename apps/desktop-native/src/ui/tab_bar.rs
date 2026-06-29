//! Vertical tab bar — the 72px-wide icon rail on the far left.
//!
//! Mirrors `apps/desktop-web/src/ui/tab_bar.rs` and web `TabBar`:
//! a column of icon+label buttons that switch the assets panel's
//! active view, plus a storage card at the bottom.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::AssetsTab;
use crate::theme::{BG_DARK, BORDER, BORDER_FAINT, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT};
use crate::ui::gfx::{border_rect, draw_text_centered, fill_rect};

/// Tab button height (matches web ~31px).
const TAB_BTN_H: i32 = 36;
/// Storage card height at the bottom.
const STORAGE_CARD_H: i32 = 56;

/// Draw the tab bar rail: all 17 tab buttons + storage card at bottom.
/// Stores tab button rects in `tab_rects` for click hit-testing.
pub unsafe fn draw_tab_bar(hdc: HDC, rect: &RECT, active: AssetsTab, tab_rects: &mut Vec<RECT>) {
    unsafe {
        fill_rect(hdc, rect, BG_DARK);
        border_rect(hdc, rect, BORDER);

        tab_rects.clear();
        let pad = 6;
        let mut y = rect.top + 8;
        let btn_w = rect.right - rect.left - 2 * pad;

        for &tab in AssetsTab::ALL {
            if y + TAB_BTN_H > rect.bottom - STORAGE_CARD_H {
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
            let bg = if is_active { 0x2A3F8C } else { BG_DARK };
            fill_rect(hdc, &btn_rect, bg);
            if is_active {
                border_rect(hdc, &btn_rect, 0x3B5BDB);
            }

            // Glyph (icon).
            let glyph_rect = RECT {
                left: btn_rect.left,
                top: btn_rect.top + 4,
                right: btn_rect.right,
                bottom: btn_rect.top + 20,
            };
            let glyph_color = if is_active { TEXT_BRIGHT } else { TEXT_DIM };
            draw_text_centered(hdc, tab.glyph(), &glyph_rect, glyph_color);

            // Label (tiny text under icon).
            let label_rect = RECT {
                left: btn_rect.left,
                top: btn_rect.top + 20,
                right: btn_rect.right,
                bottom: btn_rect.bottom,
            };
            draw_text_centered(hdc, tab.label(), &label_rect, TEXT_FAINT);

            y += TAB_BTN_H + 2;
        }

        // Storage card at the bottom.
        let card_rect = RECT {
            left: rect.left + pad,
            top: rect.bottom - STORAGE_CARD_H,
            right: rect.right - pad,
            bottom: rect.bottom - 4,
        };
        fill_rect(hdc, &card_rect, 0x111114);
        border_rect(hdc, &card_rect, BORDER_FAINT);

        // "Local" label + storage info.
        let label_rect = RECT {
            left: card_rect.left + 4,
            top: card_rect.top + 4,
            right: card_rect.right - 4,
            bottom: card_rect.top + 18,
        };
        draw_text_centered(hdc, "Local", &label_rect, TEXT_DIM);

        let info_rect = RECT {
            left: card_rect.left + 4,
            top: card_rect.top + 18,
            right: card_rect.right - 4,
            bottom: card_rect.bottom - 4,
        };
        draw_text_centered(hdc, "100%", &info_rect, TEXT_FAINT);
    }
}
