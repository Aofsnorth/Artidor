//! Footer bar rendering — project metadata + BETA badge.
//!
//! Mirrors `apps/web/src/components/editor/editor-footer.tsx`:
//! - Left: "Worked on" timer capsule
//! - Center: BETA badge (cyan border + emerald dot)
//! - Right: canvas size, fps, aspect, stereo

use std::time::{SystemTime, UNIX_EPOCH};

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{
    ACCENT_SUBTLE, BG, BG_DARK, BORDER_FAINT, CYAN, EMERALD, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT,
    TEXT_MUTED,
};
use crate::ui::gfx::{border_rect, draw_text_centered, draw_text_left, fill_rect};

/// Draw the footer: gradient strip, top border, left timer, centre BETA badge,
/// right project metadata.
pub unsafe fn draw_footer(hdc: HDC, rect: &RECT, project: &Project, _playing: bool) {
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
        // Top hairline `border-t border-white/[0.08]`.
        let hairline = RECT {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.top + 1,
        };
        fill_rect(hdc, &hairline, BORDER_FAINT);

        // Left: "Worked on" timer capsule.
        let elapsed = project_elapsed_seconds(project.metadata.created_at_ms);
        let timer_label = format_elapsed(elapsed);
        let timer_w = 128;
        let timer_h = 22;
        let timer_rect = RECT {
            left: rect.left + 16,
            top: rect.top + (fh - timer_h) / 2,
            right: rect.left + 16 + timer_w,
            bottom: rect.top + (fh - timer_h) / 2 + timer_h,
        };
        fill_rect(hdc, &timer_rect, ACCENT_SUBTLE);
        border_rect(hdc, &timer_rect, BORDER_FAINT);
        let timer_text_rect = RECT {
            left: timer_rect.left + 8,
            top: timer_rect.top,
            right: timer_rect.right - 8,
            bottom: timer_rect.bottom,
        };
        draw_text_left(
            hdc,
            &format!("WORKED  {}", timer_label),
            &timer_text_rect,
            TEXT_FAINT,
        );
        // Highlight the time value itself.
        let time_value_w = 44;
        let time_value_rect = RECT {
            left: timer_rect.right - time_value_w - 6,
            top: timer_rect.top + 2,
            right: timer_rect.right - 6,
            bottom: timer_rect.bottom - 2,
        };
        draw_text_centered(hdc, &timer_label, &time_value_rect, TEXT_BRIGHT);

        // Right: project metadata (canvas, fps, aspect, stereo).
        let meta_label = format!(
            "{}p  \u{2022}  {} fps  \u{2022}  {}  \u{2022}  Stereo",
            project.settings.canvas.height,
            project.settings.fps_label(),
            project.settings.canvas.aspect_label(),
        );
        let meta_rect = RECT {
            left: rect.right - 260,
            top: rect.top,
            right: rect.right - 16,
            bottom: rect.bottom,
        };
        draw_text_left(hdc, &meta_label, &meta_rect, TEXT_DIM);

        // Center: BETA badge (cyan border + emerald dot).
        let badge_w = 60;
        let badge_h = 20;
        let badge_rect = RECT {
            left: rect.left + (rect.right - rect.left - badge_w) / 2,
            top: rect.top + (fh - badge_h) / 2,
            right: rect.left + (rect.right - rect.left + badge_w) / 2,
            bottom: rect.top + (fh - badge_h) / 2 + badge_h,
        };
        fill_rect(hdc, &badge_rect, 0x0A1A1E); // very subtle cyan-tinted dark bg
        border_rect(hdc, &badge_rect, CYAN);
        // Emerald dot.
        let dot = RECT {
            left: badge_rect.left + 8,
            top: badge_rect.top + (badge_h - 6) / 2,
            right: badge_rect.left + 14,
            bottom: badge_rect.top + (badge_h - 6) / 2 + 6,
        };
        fill_rect(hdc, &dot, EMERALD);
        let label_rect = RECT {
            left: dot.right + 6,
            top: badge_rect.top,
            right: badge_rect.right - 4,
            bottom: badge_rect.bottom,
        };
        draw_text_left(hdc, "BETA", &label_rect, TEXT_MUTED);
    }
}

/// Elapsed seconds since project creation.
fn project_elapsed_seconds(created_at_ms: i64) -> u64 {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(created_at_ms);
    let elapsed_ms = (now - created_at_ms).max(0);
    (elapsed_ms / 1000) as u64
}

/// Format seconds as `HH:MM:SS`.
fn format_elapsed(total_seconds: u64) -> String {
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;
    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_elapsed_zero() {
        assert_eq!(format_elapsed(0), "00:00:00");
    }

    #[test]
    fn format_elapsed_one_minute() {
        assert_eq!(format_elapsed(60), "00:01:00");
    }

    #[test]
    fn format_elapsed_one_hour() {
        assert_eq!(format_elapsed(3661), "01:01:01");
    }
}
