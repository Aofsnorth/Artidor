//! Viewport toolbar — transport controls below the preview canvas.
//!
//! Mirrors `apps/web/src/components/editor/panels/preview/toolbar.tsx`:
//! - Left: audio mini-meter + editable timecode + total duration
//! - Center: transport controls (jump-start, step-back, play/pause,
//!   step-forward, jump-end)
//! - Right: loop toggle, draw-tool pills, quality menu, fullscreen toggle
//!
//! The toolbar is drawn as a 44px transparent strip with a top hairline.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{
    ACCENT_BG, ACCENT_SUBTLE, BLUE, BORDER_FAINT, EMERALD, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT,
};
use crate::ui::gfx::{
    draw_text_centered, draw_text_left, fill_rect, rounded_border_rect, rounded_fill_rect,
};
use crate::window::timeline_duration;

/// Toolbar height (matches web `PREVIEW_TOOLBAR_HEIGHT` `h-11`).
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
    pub draw_btn: RECT,
    pub quality_btn: RECT,
    // Timeline toolbar hit-test rects (new in D2D chrome).
    pub timeline_add_scene: RECT,
    pub timeline_tool_toggle: RECT,
    pub timeline_scene_selector: RECT,
    pub timeline_snapping: RECT,
    pub timeline_ripple: RECT,
    pub timeline_zoom_out: RECT,
    pub timeline_zoom_slider: RECT,
    pub timeline_zoom_in: RECT,
}

/// Format a time value as HH:MM:SS:FF (hours:minutes:seconds:frames).
fn format_timecode(seconds: f64, fps: u32) -> String {
    let total_frames = (seconds * fps as f64).round() as i64;
    let frames = total_frames % fps as i64;
    let total_secs = total_frames / fps as i64;
    let secs = total_secs % 60;
    let mins = (total_secs / 60) % 60;
    let hours = total_secs / 3600;
    format!("{:02}:{:02}:{:02}:{:02}", hours, mins, secs, frames)
}

/// Draw the viewport toolbar: timecode (left), transport (center),
/// loop + draw + quality + fullscreen (right). Stores button rects in `btns`.
pub unsafe fn draw_viewport_toolbar(
    hdc: HDC,
    rect: &RECT,
    project: &Project,
    playing: bool,
    looping: bool,
    btns: &mut ToolbarButtons,
) {
    unsafe {
        let w = rect.right - rect.left;
        let h = rect.bottom - rect.top;
        let fps = project.settings.fps_label();
        let duration = timeline_duration(project);
        let current = project.playhead.as_seconds();

        // Top hairline only (transparent body, like the web toolbar).
        let hairline = RECT {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.top + 1,
        };
        fill_rect(hdc, &hairline, BORDER_FAINT);

        // --- Left: timecode + mini audio meter ---
        // Mini audio visualizer bar.
        let meter_w = 32;
        let meter_h = 14;
        let meter_rect = RECT {
            left: rect.left + 12,
            top: rect.top + (h - meter_h) / 2,
            right: rect.left + 12 + meter_w,
            bottom: rect.top + (h - meter_h) / 2 + meter_h,
        };
        fill_rect(hdc, &meter_rect, ACCENT_SUBTLE);
        // Draw a few green bars as a fake level meter.
        let bar_w = 3;
        let gap = 1;
        let mut bx = meter_rect.left + 2;
        for _ in 0..5 {
            let bar_h = 4 + (bx % 7) as i32; // pseudo-random heights
            let brect = RECT {
                left: bx,
                top: meter_rect.bottom - 2 - bar_h,
                right: bx + bar_w,
                bottom: meter_rect.bottom - 2,
            };
            fill_rect(hdc, &brect, EMERALD);
            bx += bar_w + gap;
        }

        // Divider.
        let div = RECT {
            left: meter_rect.right + 8,
            top: rect.top + (h - 14) / 2,
            right: meter_rect.right + 9,
            bottom: rect.top + (h - 14) / 2 + 14,
        };
        fill_rect(hdc, &div, BORDER_FAINT);

        // Current timecode.
        let tc = format_timecode(current, fps);
        let total_tc = format_timecode(duration, fps);
        let tc_rect = RECT {
            left: div.right + 8,
            top: rect.top,
            right: div.right + 8 + 90,
            bottom: rect.bottom,
        };
        draw_text_left(hdc, &tc, &tc_rect, TEXT_BRIGHT);

        let slash_rect = RECT {
            left: tc_rect.right,
            top: rect.top,
            right: tc_rect.right + 16,
            bottom: rect.bottom,
        };
        draw_text_centered(hdc, "/", &slash_rect, TEXT_FAINT);

        let total_rect = RECT {
            left: slash_rect.right,
            top: rect.top,
            right: slash_rect.right + 90,
            bottom: rect.bottom,
        };
        draw_text_left(hdc, &total_tc, &total_rect, TEXT_FAINT);

        // --- Center: transport controls ---
        let btn_size = 28;
        let gap = 4;
        let total_btns_w = 5 * btn_size + 4 * gap;
        let center_x = rect.left + (w - total_btns_w) / 2;
        let btn_y = rect.top + (h - btn_size) / 2;

        // Jump to start.
        btns.jump_start = RECT {
            left: center_x,
            top: btn_y,
            right: center_x + btn_size,
            bottom: btn_y + btn_size,
        };
        rounded_fill_rect(hdc, &btns.jump_start, ACCENT_SUBTLE, 6);
        draw_text_centered(hdc, "\u{23EE}", &btns.jump_start, TEXT_DIM);

        // Step backward.
        let x2 = center_x + btn_size + gap;
        btns.step_back = RECT {
            left: x2,
            top: btn_y,
            right: x2 + btn_size,
            bottom: btn_y + btn_size,
        };
        rounded_fill_rect(hdc, &btns.step_back, ACCENT_SUBTLE, 6);
        draw_text_centered(hdc, "\u{23EA}", &btns.step_back, TEXT_DIM);

        // Play/Pause.
        let x3 = x2 + btn_size + gap;
        btns.play_pause = RECT {
            left: x3,
            top: btn_y,
            right: x3 + btn_size,
            bottom: btn_y + btn_size,
        };
        rounded_fill_rect(hdc, &btns.play_pause, BLUE, 6);
        let play_glyph = if playing { "\u{23F8}" } else { "\u{25B6}" };
        draw_text_centered(hdc, play_glyph, &btns.play_pause, 0xFFFFFF);

        // Step forward.
        let x4 = x3 + btn_size + gap;
        btns.step_fwd = RECT {
            left: x4,
            top: btn_y,
            right: x4 + btn_size,
            bottom: btn_y + btn_size,
        };
        rounded_fill_rect(hdc, &btns.step_fwd, ACCENT_SUBTLE, 6);
        draw_text_centered(hdc, "\u{23E9}", &btns.step_fwd, TEXT_DIM);

        // Jump to end.
        let x5 = x4 + btn_size + gap;
        btns.jump_end = RECT {
            left: x5,
            top: btn_y,
            right: x5 + btn_size,
            bottom: btn_y + btn_size,
        };
        rounded_fill_rect(hdc, &btns.jump_end, ACCENT_SUBTLE, 6);
        draw_text_centered(hdc, "\u{23ED}", &btns.jump_end, TEXT_DIM);

        // --- Right: loop + draw + quality + fullscreen ---
        let rx = rect.right - 12;
        let r_btn_size = 28;

        // Fullscreen.
        btns.fullscreen = RECT {
            left: rx - r_btn_size,
            top: btn_y,
            right: rx,
            bottom: btn_y + r_btn_size,
        };
        rounded_fill_rect(hdc, &btns.fullscreen, ACCENT_SUBTLE, 6);
        draw_text_centered(hdc, "\u{26F6}", &btns.fullscreen, TEXT_DIM);
        let rx2 = rx - r_btn_size - gap;

        // Quality menu.
        let quality_w = 44;
        btns.quality_btn = RECT {
            left: rx2 - quality_w,
            top: btn_y,
            right: rx2,
            bottom: btn_y + r_btn_size,
        };
        rounded_fill_rect(hdc, &btns.quality_btn, ACCENT_SUBTLE, 6);
        draw_text_centered(hdc, "Auto", &btns.quality_btn, TEXT_FAINT);
        let rx3 = rx2 - quality_w - gap;

        // Draw tool pill.
        let draw_w = 60;
        btns.draw_btn = RECT {
            left: rx3 - draw_w,
            top: btn_y,
            right: rx3,
            bottom: btn_y + r_btn_size,
        };
        rounded_fill_rect(hdc, &btns.draw_btn, ACCENT_SUBTLE, 6);
        rounded_border_rect(hdc, &btns.draw_btn, BORDER_FAINT, 6);
        draw_text_centered(hdc, "Draw", &btns.draw_btn, TEXT_FAINT);
        let rx4 = rx3 - draw_w - gap;

        // Loop.
        btns.loop_btn = RECT {
            left: rx4 - r_btn_size,
            top: btn_y,
            right: rx4,
            bottom: btn_y + r_btn_size,
        };
        let loop_bg = if looping { ACCENT_BG } else { ACCENT_SUBTLE };
        rounded_fill_rect(hdc, &btns.loop_btn, loop_bg, 6);
        let loop_color = if looping { TEXT_BRIGHT } else { TEXT_DIM };
        draw_text_centered(hdc, "\u{21BB}", &btns.loop_btn, loop_color);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_timecode_zero() {
        assert_eq!(format_timecode(0.0, 30), "00:00:00:00");
    }

    #[test]
    fn format_timecode_one_second() {
        assert_eq!(format_timecode(1.0, 30), "00:00:01:00");
    }

    #[test]
    fn format_timecode_with_frames() {
        assert_eq!(format_timecode(1.5, 30), "00:00:01:15");
    }

    #[test]
    fn format_timecode_one_minute() {
        assert_eq!(format_timecode(60.0, 30), "00:01:00:00");
    }
}
