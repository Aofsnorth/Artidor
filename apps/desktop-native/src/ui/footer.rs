//! Footer bar rendering — play/pause indicator + timecode + settings.
//!
//! Mirrors `apps/desktop-web/src/ui/footer.rs`.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{BG, BG_DARK, BORDER_FAINT, TEXT_BRIGHT, TEXT_DIM};
use crate::ui::gfx::{border_rect, draw_text_centered, draw_text_left, fill_rect};
use crate::window::timeline_duration;

/// Draw the footer: left = play/pause glyph + timecode, center = settings.
pub unsafe fn draw_footer(hdc: HDC, rect: &RECT, project: &Project, playing: bool) {
    unsafe {
        // Two-band gradient approximation (#111114 -> #08080a).
        let fh = rect.bottom - rect.top;
        let top_band = RECT {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.top + fh / 2,
        };
        let bot_band = RECT {
            left: rect.left,
            top: rect.top + fh / 2,
            right: rect.right,
            bottom: rect.bottom,
        };
        fill_rect(hdc, &top_band, BG);
        fill_rect(hdc, &bot_band, BG_DARK);
        border_rect(hdc, rect, BORDER_FAINT);

        // Left: play/pause glyph + timecode.
        let duration = timeline_duration(project);
        let current = project.playhead.as_seconds();
        let play_glyph = if playing { "\u{23F8}" } else { "\u{25B6}" };
        let time_label = format!("{}  {:07.2}s / {:07.2}s", play_glyph, current, duration);
        let left_rect = RECT {
            left: rect.left + 12,
            top: rect.top,
            right: rect.left + 200,
            bottom: rect.bottom,
        };
        draw_text_left(hdc, &time_label, &left_rect, TEXT_BRIGHT);

        // Center: settings (matches web editor-footer.tsx).
        let footer_label = format!(
            "{}p  \u{2022}  {} fps  \u{2022}  {}  \u{2022}  Stereo",
            project.settings.canvas.height,
            project.settings.fps_label(),
            project.settings.canvas.aspect_label(),
        );
        draw_text_centered(hdc, &footer_label, rect, TEXT_DIM);
    }
}
