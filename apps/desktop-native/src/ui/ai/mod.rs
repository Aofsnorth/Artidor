//! AI copilot panel — suggestions rendered in the tools panel.
//!
//! Mirrors `apps/desktop-web/src/ui/ai/mod.rs`.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::ai;
use crate::state::Project;
use crate::theme::{BORDER_FAINT, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT};
use crate::ui::gfx::{draw_text_left, fill_rect};

/// Draw copilot suggestions in the lower portion of the tools panel.
pub unsafe fn draw_copilot_suggestions(hdc: HDC, panel: &RECT, project: &Project) {
    unsafe {
        let panel_h = panel.bottom - panel.top;
        let copilot_top = panel.top + (panel_h * 55 / 100).max(180);

        let sep = RECT {
            left: panel.left + 8,
            top: copilot_top,
            right: panel.right - 8,
            bottom: copilot_top + 1,
        };
        fill_rect(hdc, &sep, BORDER_FAINT);

        let header = RECT {
            left: panel.left + 8,
            top: copilot_top + 6,
            right: panel.right - 8,
            bottom: copilot_top + 24,
        };
        draw_text_left(hdc, "AI Copilot  (local stub)", &header, TEXT_DIM);

        let suggestions = ai::suggest(project);
        let mut y = copilot_top + 28;
        for s in &suggestions {
            if y + 34 > panel.bottom {
                break;
            }
            let title_rect = RECT {
                left: panel.left + 10,
                top: y,
                right: panel.right - 10,
                bottom: y + 16,
            };
            draw_text_left(hdc, &s.title, &title_rect, TEXT_BRIGHT);
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
