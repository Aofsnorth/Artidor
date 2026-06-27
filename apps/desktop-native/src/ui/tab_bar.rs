//! Tab bar rail rendering — the vertical icon rail on the left.
//!
//! Mirrors `apps/desktop-web/src/ui/tab_bar.rs`.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::theme::{BG_DARK, BORDER, TEXT_FAINT};
use crate::ui::gfx::{border_rect, draw_text_centered, fill_rect};

/// Draw the tab bar rail: dark panel + border + "Assets" label.
pub unsafe fn draw_tab_bar(hdc: HDC, rect: &RECT) {
    unsafe {
        fill_rect(hdc, rect, BG_DARK);
        border_rect(hdc, rect, BORDER);
        draw_text_centered(hdc, "Assets", rect, TEXT_FAINT);
    }
}
