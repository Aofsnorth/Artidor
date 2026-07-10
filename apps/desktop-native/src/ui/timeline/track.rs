//! Timeline track row rendering — one row per track with clip blocks.
//!
//! Mirrors `apps/desktop-web/src/ui/timeline/track.rs`.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::{Track, TrackType};
use crate::theme::{
    TEXT_BRIGHT, TEXT_DIM, TRACK_BG, TRACK_PAD, TRACK_ROW_H, TRACK_SELECTED_BORDER,
};
use crate::ui::gfx::{
    border_rect, draw_text_centered, draw_text_left, fill_rect, rounded_fill_rect,
};

/// Draw a single track row: type tag + name + clip blocks.
/// Uses zoom (pps) + scroll (seconds) for pixel-accurate clip placement.
/// Returns the row's bottom y for the next row.
pub unsafe fn draw_track_row(
    hdc: HDC,
    panel: &RECT,
    row_y: i32,
    track: &Track,
    track_index: usize,
    selected_track: usize,
    selected_element: Option<(usize, usize)>,
    zoom_pps: f64,
    scroll_seconds: f64,
    list_bottom: i32,
) -> i32 {
    unsafe {
        let panel_w = panel.right - panel.left;
        if row_y + TRACK_ROW_H > list_bottom {
            return row_y; // no scrolling yet; clip remaining tracks
        }
        let row = RECT {
            left: panel.left + TRACK_PAD,
            top: row_y,
            right: panel.left + panel_w - TRACK_PAD,
            bottom: row_y + TRACK_ROW_H - 2,
        };
        rounded_fill_rect(hdc, &row, TRACK_BG, 4);
        if track_index == selected_track {
            border_rect(hdc, &row, TRACK_SELECTED_BORDER);
        }

        let tag_color = match track.track_type {
            TrackType::Video => 0x3B5BDB,
            TrackType::Text => 0xE64980,
            TrackType::Audio => 0x20C997,
            TrackType::Graphic => 0xFAB005,
        };
        let tag = RECT {
            left: row.left + 4,
            top: row.top + 4,
            right: row.left + 52,
            bottom: row.bottom - 4,
        };
        rounded_fill_rect(hdc, &tag, tag_color, 4);
        draw_text_centered(hdc, track.track_type.label(), &tag, 0x111114);

        let mut label = track.name.clone();
        // Append state indicators (matches web track header badges).
        if track.muted {
            label.push_str("  [M]");
        }
        if track.soloed {
            label.push_str("  [S]");
        }
        if track.hidden {
            label.push_str("  [H]");
        }
        if track.locked {
            label.push_str("  [L]");
        }
        let header_right = row.left + 140;
        let name_rect = RECT {
            left: tag.right + 8,
            top: row.top,
            right: header_right,
            bottom: row.bottom,
        };
        let name_color = if track_index == selected_track {
            TEXT_BRIGHT
        } else {
            TEXT_DIM
        };
        draw_text_left(hdc, &label, &name_rect, name_color);

        // Clip blocks — pixel-accurate via zoom + scroll.
        let clip_area_left = header_right + 4;
        let clip_area_right = row.right - 4;
        for (ei, element) in track.elements.iter().enumerate() {
            let clip_x = crate::window::time_to_x(
                element.start_seconds,
                zoom_pps,
                scroll_seconds,
                clip_area_left,
            );
            let clip_end_x = crate::window::time_to_x(
                element.end_seconds(),
                zoom_pps,
                scroll_seconds,
                clip_area_left,
            );
            // Skip clips entirely outside the visible area.
            if clip_end_x < clip_area_left || clip_x > clip_area_right {
                continue;
            }
            let clip_w = (clip_end_x - clip_x).max(2);
            // Clamp drawing to the clip area.
            let draw_x = clip_x.max(clip_area_left);
            let draw_right = (clip_x + clip_w).min(clip_area_right);
            if draw_right <= draw_x {
                continue;
            }
            let clip_rect = RECT {
                left: draw_x,
                top: row.top + 3,
                right: draw_right,
                bottom: row.bottom - 3,
            };
            let clip_color = match track.track_type {
                TrackType::Video => 0x2A3F8C,
                TrackType::Text => 0xA8365C,
                TrackType::Audio => 0x178E6B,
                TrackType::Graphic => 0xB8860B,
            };
            fill_rect(hdc, &clip_rect, clip_color);
            let clip_border = if selected_element == Some((track_index, ei)) {
                0xB3B3B8
            } else {
                tag_color
            };
            border_rect(hdc, &clip_rect, clip_border);
            if (draw_right - draw_x) > 30 {
                draw_text_left(hdc, &element.name, &clip_rect, 0xE8E8EC);
            }
        }

        row_y + TRACK_ROW_H
    }
}
