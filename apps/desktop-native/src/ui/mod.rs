//! UI rendering module — orchestrates all panel painting.
//!
//! Mirrors `apps/desktop-web/src/ui/mod.rs`.

pub mod ai;
pub mod assets;
pub mod font;
pub mod footer;
pub mod gfx;
pub mod header;
pub mod inspector;
pub mod layout;
pub mod tab_bar;
pub mod timeline;
pub mod welcome;

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{BG, BORDER_FAINT};
use crate::ui::gfx::{border_rect, draw_text_centered, fill_rect};
use crate::window::timeline_duration;

/// Paint the editor chrome (everything except the viewport child window).
/// Delegates to each panel module. Project data drives the labels.
pub unsafe fn paint_chrome(
    hdc: HDC,
    layout: &layout::Layout,
    client: &RECT,
    project: &Project,
    selected_track: usize,
    playing: bool,
    selected_element: Option<(usize, usize)>,
    teleprompter_text: &str,
    teleprompter_on: bool,
    zoom_pps: f64,
    scroll_seconds: f64,
) {
    unsafe {
        fill_rect(hdc, client, BG);

        header::draw_header(hdc, &layout.header, project);
        footer::draw_footer(hdc, &layout.footer, project, playing);
        tab_bar::draw_tab_bar(hdc, &layout.tabbar);

        // Tools panel: assets + copilot.
        fill_rect(hdc, &layout.tools, BG);
        border_rect(hdc, &layout.tools, BORDER_FAINT);
        assets::draw_assets_list(hdc, &layout.tools, project);
        ai::draw_copilot_suggestions(hdc, &layout.tools, project);

        // Properties panel.
        fill_rect(hdc, &layout.properties, BG);
        border_rect(hdc, &layout.properties, BORDER_FAINT);
        inspector::draw_properties_panel(hdc, &layout.properties, project, selected_element);

        // Timeline panel.
        fill_rect(hdc, &layout.timeline, BG);
        border_rect(hdc, &layout.timeline, BORDER_FAINT);
        timeline::draw_timeline_tracks(
            hdc,
            &layout.timeline,
            project,
            selected_track,
            playing,
            selected_element,
            zoom_pps,
            scroll_seconds,
        );

        // Preview panel frame.
        border_rect(hdc, &layout.preview, BORDER_FAINT);

        // Teleprompter overlay.
        if teleprompter_on && !teleprompter_text.is_empty() {
            draw_teleprompter_overlay(hdc, &layout.preview, project, teleprompter_text);
        }
    }
}

/// Draw the teleprompter overlay: scrolling text over the preview's
/// lower third, positioned by the playhead fraction of the timeline.
unsafe fn draw_teleprompter_overlay(hdc: HDC, preview: &RECT, project: &Project, text: &str) {
    unsafe {
        let pw = preview.right - preview.left;
        let ph = preview.bottom - preview.top;
        let band_h = (ph * 35 / 100).max(60);
        let band = RECT {
            left: preview.left,
            top: preview.bottom - band_h,
            right: preview.right,
            bottom: preview.bottom,
        };
        fill_rect(hdc, &band, 0x05050A);

        let inner_w = pw - 24;
        let lines = wrap_text(text, inner_w as usize);

        let duration = timeline_duration(project).max(0.1);
        let frac = (project.playhead.as_seconds() / duration).clamp(0.0, 1.0);
        let line_h = 20;
        let total_lines = lines.len();
        let visible_lines = (band_h / line_h) as usize;
        let scroll_lines = if total_lines > visible_lines {
            ((frac * total_lines as f64) as usize).min(total_lines.saturating_sub(visible_lines))
        } else {
            0
        };

        let mut y = band.top + 8;
        for line in lines.iter().skip(scroll_lines).take(visible_lines) {
            if y + line_h > band.bottom {
                break;
            }
            let line_rect = RECT {
                left: band.left + 12,
                top: y,
                right: band.right - 12,
                bottom: y + line_h,
            };
            draw_text_centered(hdc, line, &line_rect, 0xF0F0F4);
            y += line_h;
        }
    }
}

/// Naive word-wrap by char count (good enough for a teleprompter).
fn wrap_text(text: &str, max_chars: usize) -> Vec<String> {
    if max_chars == 0 {
        return vec![text.to_string()];
    }
    let mut lines = Vec::new();
    for paragraph in text.split('\n') {
        if paragraph.is_empty() {
            lines.push(String::new());
            continue;
        }
        let mut current = String::new();
        for word in paragraph.split_whitespace() {
            if current.is_empty() {
                current = word.to_string();
            } else if current.len() + 1 + word.len() <= max_chars {
                current.push(' ');
                current.push_str(word);
            } else {
                lines.push(current.clone());
                current = word.to_string();
            }
        }
        if !current.is_empty() {
            lines.push(current);
        }
    }
    if lines.is_empty() {
        lines.push(String::new());
    }
    lines
}
