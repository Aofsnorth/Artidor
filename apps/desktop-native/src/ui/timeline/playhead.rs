//! Playhead indicator — vertical line across the track list area.
//!
//! Mirrors `apps/desktop-web/src/ui/timeline/playhead.rs`.

use windows::Win32::Foundation::{COLORREF, RECT};
use windows::Win32::Graphics::Gdi::{CreatePen, DeleteObject, PS_SOLID, Rectangle, SelectObject};

use crate::state::Project;
use crate::theme::{PLAYHEAD_COLOR, TRACK_PAD, rgb};
use crate::window::timeline_duration;

/// Draw the playhead vertical line + the readout strip at the bottom.
/// Uses zoom (pps) + scroll (seconds) for pixel-accurate placement.
pub unsafe fn draw_playhead(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    panel: &RECT,
    project: &Project,
    project_is_playing: bool,
    list_bottom: i32,
    zoom_pps: f64,
    scroll_seconds: f64,
) {
    unsafe {
        let panel_w = panel.right - panel.left;
        let header_right = panel.left + TRACK_PAD + 140;
        let clip_area_left = header_right + 4;
        let clip_area_right = panel.left + panel_w - TRACK_PAD;

        // Vertical playhead line (pixel-accurate via zoom/scroll).
        let px = crate::window::time_to_x(
            project.playhead.as_seconds(),
            zoom_pps,
            scroll_seconds,
            clip_area_left,
        );
        if px >= clip_area_left && px <= clip_area_right {
            let pen = CreatePen(PS_SOLID, 2, COLORREF(rgb(PLAYHEAD_COLOR)));
            let old = SelectObject(hdc, pen.into());
            let _ = Rectangle(hdc, px, panel.top + TRACK_PAD, px + 2, list_bottom);
            let _ = SelectObject(hdc, old);
            let _ = DeleteObject(pen.into());
        }

        // Readout strip.
        let readout = RECT {
            left: panel.left,
            top: list_bottom,
            right: panel.right,
            bottom: panel.bottom,
        };
        let frame = project
            .playhead
            .frame_floor(project.settings.fps)
            .unwrap_or(0);
        let readout_label = format!(
            "Playhead {:.3}s (frame {})  {}  \u{2022}  {} tracks  \u{2022}  \u{2190}\u{2192} seek  \u{2191}\u{2193} select  T track  E clip  M mute  Space play  Ctrl+R rename  Ctrl+S/O/I/E",
            project.playhead.as_seconds(),
            frame,
            if project_is_playing {
                "[PLAYING]"
            } else {
                "[PAUSED]"
            },
            project.scene.tracks.len(),
        );
        crate::ui::gfx::draw_text_centered(hdc, &readout_label, &readout, crate::theme::TEXT_FAINT);
    }
}
