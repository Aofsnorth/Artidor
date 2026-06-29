//! Timeline panel — ruler + track list + playhead + readout.
//!
//! Orchestrates ruler, track rows, and playhead indicator. Mirrors
//! `apps/desktop-web/src/ui/timeline/mod.rs`.

pub mod playhead;
pub mod ruler;
pub mod track;

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{BG, BORDER_FAINT, RULER_H, TRACK_PAD};
use crate::ui::gfx::{border_rect, fill_rect};

/// Draw the full timeline panel: ruler + background + border + track
/// rows + playhead + readout strip. Uses zoom + scroll for pixel-accurate
/// layout. The ruler occupies the top RULER_H pixels; tracks start below it.
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

        // Ruler strip at the top.
        let ruler_rect = RECT {
            left: panel.left,
            top: panel.top,
            right: panel.right,
            bottom: panel.top + RULER_H,
        };
        ruler::draw_ruler(
            hdc,
            &ruler_rect,
            zoom_pps,
            scroll_seconds,
            project.playhead.as_seconds(),
        );

        let readout_h = 22;
        let list_bottom = panel.bottom - readout_h;

        // Tracks start below the ruler.
        let mut y = ruler_rect.bottom + TRACK_PAD;
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
