//! Playhead indicator — vertical line across the track list area.
//!
//! Mirrors `apps/desktop-web/src/ui/timeline/playhead.rs`.

use windows::Win32::Foundation::{COLORREF, RECT};
use windows::Win32::Graphics::Gdi::{CreatePen, DeleteObject, PS_SOLID, Rectangle, SelectObject};

use crate::state::Project;
use crate::theme::{PLAYHEAD_COLOR, TRACK_PAD, rgb};
use crate::window::timeline_duration;

/// Draw the playhead vertical line + the readout strip at the bottom.
pub unsafe fn draw_playhead(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    panel: &RECT,
    project: &Project,
    project_is_playing: bool,
    list_bottom: i32,
) {
    unsafe {
        let panel_w = panel.right - panel.left;
        let duration = timeline_duration(project);

        // Vertical playhead line.
        if duration > 0.0 {
            let frac = (project.playhead.as_seconds() / duration).clamp(0.0, 1.0);
            let track_area_left = panel.left + TRACK_PAD;
            let track_area_right = panel.left + panel_w - TRACK_PAD;
            let track_area_w = (track_area_right - track_area_left).max(1);
            let px = track_area_left + (frac * track_area_w as f64) as i32;
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
