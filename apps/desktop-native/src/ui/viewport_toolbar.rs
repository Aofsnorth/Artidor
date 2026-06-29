//! Viewport toolbar — transport controls below the preview canvas.
//!
//! Mirrors `apps/desktop-web/src/ui/viewport_panel.rs` (preview toolbar):
//! - Left: timecode display (current / total)
//! - Center: transport controls (jump-start, step-back, play/pause,
//!   step-forward, jump-end)
//! - Right: loop toggle + fullscreen toggle
//!
//! The toolbar is drawn as a 44px strip at the bottom of the preview
//! panel. Button rects are stored for click hit-testing.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{BG, BG_DARK, BORDER_FAINT, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT};
use crate::ui::gfx::{border_rect, draw_text_centered, draw_text_left, fill_rect};
use crate::window::timeline_duration;

/// Toolbar height (matches web `PREVIEW_TOOLBAR_HEIGHT`).
pub const TOOLBAR_H: i32 = 44;

/// Button rects for hit-testing.
#[derive(Clone, Copy, Default)]
pub struct ToolbarButtons {
    pub jump_start: RECT,
    pub step_back: RECT,
    pub play_pause: RECT,
    pub step_fwd: RECT,
    pub jump_end: RECT,
    pub loop_btn: RECT,
    pub fullscreen: RECT,
}

/// Format a time value as MM:SS:FF (minutes:seconds:frames).
fn format_timecode(seconds: f64, fps: u32) -> String {
    let total_frames = (seconds * fps as f64) as i32;
    let frames = total_frames % fps as i32;
    let total_secs = total_frames / fps as i32;
    let secs = total_secs % 60;
    let mins = total_secs / 60;
    format!("{:02}:{:02}:{:02}", mins, secs, frames)
}

/// Draw the viewport toolbar: timecode (left), transport (center),
/// loop + fullscreen (right). Stores button rects in `btns`.
pub unsafe fn draw_viewport_toolbar(
    hdc: HDC,
    rect: &RECT,
    project: &Project,
    playing: bool,
    looping: bool,
    btns: &mut ToolbarButtons,
) {
    unsafe {
        fill_rect(hdc, rect, BG);
        border_rect(hdc, rect, BORDER_FAINT);

        let w = rect.right - rect.left;
        let h = rect.bottom - rect.top;
        let fps = project.settings.fps_label();
        let duration = timeline_duration(project);
        let current = project.playhead.as_seconds();

        // --- Left: timecode ---
        let tc = format_timecode(current, fps);
        let total_tc = format_timecode(duration, fps);
        let tc_label = format!("{} / {}", tc, total_tc);
        let tc_rect = RECT {
            left: rect.left + 12,
            top: rect.top,
            right: rect.left + 140,
            bottom: rect.bottom,
        };
        draw_text_left(hdc, &tc_label, &tc_rect, TEXT_BRIGHT);

        // --- Center: transport controls ---
        let btn_size = 28;
        let gap = 4;
        let total_btns_w = 5 * btn_size + 4 * gap;
        let center_x = rect.left + (w - total_btns_w) / 2;
        let btn_y = rect.top + (h - btn_size) / 2;

        // Jump to start (⏮).
        btns.jump_start = RECT {
            left: center_x,
            top: btn_y,
            right: center_x + btn_size,
            bottom: btn_y + btn_size,
        };
        fill_rect(hdc, &btns.jump_start, BG_DARK);
        draw_text_centered(hdc, "\u{23EE}", &btns.jump_start, TEXT_DIM);

        // Step backward (⏪).
        let x2 = center_x + btn_size + gap;
        btns.step_back = RECT {
            left: x2,
            top: btn_y,
            right: x2 + btn_size,
            bottom: btn_y + btn_size,
        };
        fill_rect(hdc, &btns.step_back, BG_DARK);
        draw_text_centered(hdc, "\u{23EA}", &btns.step_back, TEXT_DIM);

        // Play/Pause (▶ / ⏸).
        let x3 = x2 + btn_size + gap;
        btns.play_pause = RECT {
            left: x3,
            top: btn_y,
            right: x3 + btn_size,
            bottom: btn_y + btn_size,
        };
        fill_rect(hdc, &btns.play_pause, 0x2A3F8C);
        let play_glyph = if playing { "\u{23F8}" } else { "\u{25B6}" };
        draw_text_centered(hdc, play_glyph, &btns.play_pause, 0xFFFFFF);

        // Step forward (⏩).
        let x4 = x3 + btn_size + gap;
        btns.step_fwd = RECT {
            left: x4,
            top: btn_y,
            right: x4 + btn_size,
            bottom: btn_y + btn_size,
        };
        fill_rect(hdc, &btns.step_fwd, BG_DARK);
        draw_text_centered(hdc, "\u{23E9}", &btns.step_fwd, TEXT_DIM);

        // Jump to end (⏭).
        let x5 = x4 + btn_size + gap;
        btns.jump_end = RECT {
            left: x5,
            top: btn_y,
            right: x5 + btn_size,
            bottom: btn_y + btn_size,
        };
        fill_rect(hdc, &btns.jump_end, BG_DARK);
        draw_text_centered(hdc, "\u{23ED}", &btns.jump_end, TEXT_DIM);

        // --- Right: loop + fullscreen ---
        let rx = rect.right - 12;
        let r_btn_size = 28;

        // Fullscreen (⛶).
        btns.fullscreen = RECT {
            left: rx - r_btn_size,
            top: btn_y,
            right: rx,
            bottom: btn_y + btn_size,
        };
        fill_rect(hdc, &btns.fullscreen, BG_DARK);
        draw_text_centered(hdc, "\u{26F6}", &btns.fullscreen, TEXT_DIM);
        let rx2 = rx - r_btn_size - gap;

        // Loop (↻).
        btns.loop_btn = RECT {
            left: rx2 - r_btn_size,
            top: btn_y,
            right: rx2,
            bottom: btn_y + btn_size,
        };
        let loop_bg = if looping { 0x2A3F8C } else { BG_DARK };
        fill_rect(hdc, &btns.loop_btn, loop_bg);
        let loop_color = if looping { 0xFFFFFF } else { TEXT_DIM };
        draw_text_centered(hdc, "\u{21BB}", &btns.loop_btn, loop_color);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_timecode_zero() {
        assert_eq!(format_timecode(0.0, 30), "00:00:00");
    }

    #[test]
    fn format_timecode_one_second() {
        assert_eq!(format_timecode(1.0, 30), "00:01:00");
    }

    #[test]
    fn format_timecode_with_frames() {
        assert_eq!(format_timecode(1.5, 30), "00:01:15");
    }

    #[test]
    fn format_timecode_one_minute() {
        assert_eq!(format_timecode(60.0, 30), "01:00:00");
    }
}
