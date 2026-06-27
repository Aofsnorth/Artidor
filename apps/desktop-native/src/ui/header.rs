//! Header bar rendering — project name centered, 1:1 with web header.
//!
//! Mirrors `apps/desktop-web/src/ui/header.rs`.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{BG, BORDER, TEXT_BRIGHT};
use crate::ui::gfx::{border_rect, draw_text_centered, fill_rect};

/// Draw the header bar: background + border + centered project name.
pub unsafe fn draw_header(hdc: HDC, rect: &RECT, project: &Project) {
    unsafe {
        fill_rect(hdc, rect, BG);
        border_rect(hdc, rect, BORDER);
        draw_text_centered(hdc, &project.metadata.name, rect, TEXT_BRIGHT);
    }
}
