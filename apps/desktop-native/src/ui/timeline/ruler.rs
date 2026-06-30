//! Timeline ruler — frame markers and time labels.
//!
//! Renders a horizontal ruler at the top of the timeline panel with
//! tick marks and time labels (e.g. "0.5s", "1.0s"). The marker
//! interval adapts to the zoom level so labels stay ~80px apart.
//! Clicking on the ruler seeks the playhead to that time.
//!
//! Mirrors `apps/desktop-web/src/ui/timeline/ruler.rs`.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::theme::{BORDER, BORDER_FAINT, PANEL_BG, RULER_H, TEXT_FAINT, TRACK_PAD};
use crate::ui::gfx::{border_rect, draw_text_left, fill_rect};

/// Draw the timeline ruler: background + tick marks + time labels.
/// Uses zoom (pps) + scroll (seconds) for pixel-accurate placement.
pub unsafe fn draw_ruler(
    hdc: HDC,
    ruler: &RECT,
    zoom_pps: f64,
    scroll_seconds: f64,
    playhead_seconds: f64,
) {
    unsafe {
        fill_rect(hdc, ruler, PANEL_BG);
        border_rect(hdc, ruler, BORDER_FAINT);

        let panel_w = ruler.right - ruler.left;
        let header_right = ruler.left + TRACK_PAD + 140;
        let clip_left = header_right + 4;
        let clip_right = ruler.left + panel_w - TRACK_PAD;
        let clip_w = (clip_right - clip_left).max(1) as f64;

        // Determine marker interval in seconds (target ~80px between labels).
        let target_px = 80.0;
        let min_interval_seconds = target_px / zoom_pps;
        let interval = nice_interval(min_interval_seconds);

        // Draw tick marks + labels from scroll_seconds onward.
        let first_marker = (scroll_seconds / interval).floor() * interval;
        let mut t = first_marker;
        let max_t = scroll_seconds + clip_w / zoom_pps + interval;

        while t <= max_t {
            if t < 0.0 {
                t += interval;
                continue;
            }
            let x = crate::window::time_to_x(t, zoom_pps, scroll_seconds, clip_left);
            if x < clip_left || x > clip_right {
                t += interval;
                continue;
            }

            // Tick mark — full height for major markers.
            let tick_rect = RECT {
                left: x,
                top: ruler.top + RULER_H - 8,
                right: x + 1,
                bottom: ruler.bottom,
            };
            fill_rect(hdc, &tick_rect, BORDER);

            // Time label.
            let label = format_time_label(t);
            let label_rect = RECT {
                left: x + 3,
                top: ruler.top + 2,
                right: x + 60,
                bottom: ruler.top + RULER_H - 8,
            };
            draw_text_left(hdc, &label, &label_rect, TEXT_FAINT);

            t += interval;
        }

        // Playhead handle on the ruler (a small triangle/rect).
        let ph_x = crate::window::time_to_x(playhead_seconds, zoom_pps, scroll_seconds, clip_left);
        if ph_x >= clip_left && ph_x <= clip_right {
            let handle_rect = RECT {
                left: ph_x - 3,
                top: ruler.top,
                right: ph_x + 4,
                bottom: ruler.bottom,
            };
            fill_rect(hdc, &handle_rect, 0xE8E8EC);
        }

        // Header separator (between track names and clip area).
        let sep_rect = RECT {
            left: header_right,
            top: ruler.top,
            right: header_right + 1,
            bottom: ruler.bottom,
        };
        fill_rect(hdc, &sep_rect, BORDER);
    }
}

/// Choose a "nice" marker interval (in seconds) that is >= the given
/// minimum. Rounds up to: 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120,
/// 300, 600 seconds. Matches the web app's `determine_marker_interval`.
fn nice_interval(min_seconds: f64) -> f64 {
    for &nice in &[
        0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 30.0, 60.0, 120.0, 300.0, 600.0,
    ] {
        if nice >= min_seconds {
            return nice;
        }
    }
    600.0
}

/// Format a time value for the ruler label. Shows "0.5s", "1.0s",
/// "15s", "1m", "5m" etc. Matches the web app's label formatting.
fn format_time_label(seconds: f64) -> String {
    if seconds < 1.0 {
        format!("{:.1}s", seconds)
    } else if seconds < 60.0 {
        if seconds == seconds.trunc() {
            format!("{}s", seconds as i32)
        } else {
            format!("{:.1}s", seconds)
        }
    } else {
        let mins = (seconds / 60.0).floor() as i32;
        if mins * 60 == seconds as i32 {
            format!("{}m", mins)
        } else {
            format!("{:.1}m", seconds / 60.0)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nice_interval_rounds_up() {
        assert_eq!(nice_interval(0.05), 0.1);
        assert_eq!(nice_interval(0.3), 0.5);
        assert_eq!(nice_interval(0.7), 1.0);
        assert_eq!(nice_interval(3.0), 5.0);
        assert_eq!(nice_interval(70.0), 120.0);
    }

    #[test]
    fn format_label_sub_second() {
        assert_eq!(format_time_label(0.5), "0.5s");
    }

    #[test]
    fn format_label_whole_second() {
        assert_eq!(format_time_label(5.0), "5s");
    }

    #[test]
    fn format_label_decimal_second() {
        assert_eq!(format_time_label(1.5), "1.5s");
    }

    #[test]
    fn format_label_whole_minute() {
        assert_eq!(format_time_label(60.0), "1m");
    }

    #[test]
    fn format_label_decimal_minute() {
        assert_eq!(format_time_label(90.0), "1.5m");
    }
}
