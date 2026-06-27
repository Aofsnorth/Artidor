//! Timeline track row rendering — one row per track with clip blocks.
//!
//! Mirrors `apps/desktop-web/src/ui/timeline/track.rs`.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::{Project, Track, TrackType};
use crate::theme::{BG_DARK, TEXT_BRIGHT, TEXT_DIM, TRACK_PAD, TRACK_ROW_H};
use crate::ui::gfx::{border_rect, draw_text_centered, draw_text_left, fill_rect};

/// Draw a single track row: type tag + name + clip blocks.
/// Returns the row's bottom y for the next row.
pub unsafe fn draw_track_row(
    hdc: HDC,
    panel: &RECT,
    row_y: i32,
    track: &Track,
    track_index: usize,
    selected_track: usize,
    selected_element: Option<(usize, usize)>,
    duration: f64,
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
        fill_rect(hdc, &row, BG_DARK);
        if track_index == selected_track {
            border_rect(hdc, &row, 0x4D4D52);
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
        fill_rect(hdc, &tag, tag_color);
        draw_text_centered(hdc, track.track_type.label(), &tag, 0x111114);

        let mut label = track.name.clone();
        if track.muted {
            label.push_str("  (muted)");
        }
        if track.hidden {
            label.push_str("  (hidden)");
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

        // Clip blocks.
        if duration > 0.0 {
            let clip_area_left = header_right + 4;
            let clip_area_right = row.right - 4;
            let clip_area_w = (clip_area_right - clip_area_left).max(1) as f64;
            for (ei, element) in track.elements.iter().enumerate() {
                let start_frac = (element.start_seconds / duration).clamp(0.0, 1.0);
                let end_frac = (element.end_seconds() / duration).clamp(0.0, 1.0);
                let clip_x = clip_area_left + (start_frac * clip_area_w) as i32;
                let clip_w = ((end_frac - start_frac) * clip_area_w) as i32;
                if clip_w < 2 {
                    continue;
                }
                let clip_rect = RECT {
                    left: clip_x,
                    top: row.top + 3,
                    right: clip_x + clip_w,
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
                if clip_w > 30 {
                    draw_text_left(hdc, &element.name, &clip_rect, 0xE8E8EC);
                }
            }
        }

        row_y + TRACK_ROW_H
    }
}
