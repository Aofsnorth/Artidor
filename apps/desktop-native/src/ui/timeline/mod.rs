//! Timeline panel — track list + playhead + readout.
//!
//! Orchestrates track rows + playhead indicator. Mirrors
//! `apps/desktop-web/src/ui/timeline/mod.rs`.

pub mod playhead;
pub mod track;

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{BG, BORDER_FAINT, TRACK_PAD};
use crate::ui::gfx::{border_rect, fill_rect};
use crate::window::timeline_duration;

/// Draw the full timeline panel: background + border + track rows +
/// playhead + readout strip. Uses zoom + scroll for pixel-accurate layout.
pub unsafe fn draw_timeline_tracks(
    hdc: HDC,
    panel: &RECT,
    project: &Project,
    selected_track: usize,
    project_is_playing: bool,
    selected_element: Option<(usize, usize)>,
    zoom_pps: f64,
    scroll_seconds: f64,
) {
    unsafe {
        fill_rect(hdc, panel, BG);
        border_rect(hdc, panel, BORDER_FAINT);

        let readout_h = 22;
        let list_bottom = panel.bottom - readout_h;

        let mut y = panel.top + TRACK_PAD;
        for (i, track) in project.scene.tracks.iter().enumerate() {
            y = track::draw_track_row(
                hdc,
                panel,
                y,
                track,
                i,
                selected_track,
                selected_element,
                zoom_pps,
                scroll_seconds,
                list_bottom,
            );
            if y + 28 > list_bottom {
                break;
            }
        }

        playhead::draw_playhead(
            hdc,
            panel,
            project,
            project_is_playing,
            list_bottom,
            zoom_pps,
            scroll_seconds,
        );
    }
}
