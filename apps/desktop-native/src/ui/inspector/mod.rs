//! Inspector panel — project/clip properties.
//!
//! Shows clip properties when a clip is selected, project properties
//! otherwise. Mirrors `apps/desktop-web/src/ui/inspector/mod.rs`.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{PROP_PAD, PROP_ROW_H, TEXT_DIM, TEXT_FAINT};
use crate::ui::gfx::draw_text_left;
use crate::window::timeline_duration;

/// Draw the properties panel. When a clip is selected, shows clip
/// fields; otherwise shows project-level settings.
pub unsafe fn draw_properties_panel(
    hdc: HDC,
    panel: &RECT,
    project: &Project,
    selected_element: Option<(usize, usize)>,
) {
    unsafe {
        let header = RECT {
            left: panel.left + PROP_PAD,
            top: panel.top + 6,
            right: panel.right - PROP_PAD,
            bottom: panel.top + 24,
        };

        let mut y = panel.top + 28;
        let left = panel.left + PROP_PAD;
        let right = panel.right - PROP_PAD;

        // Clip properties (if a clip is selected).
        if let Some((ti, ei)) = selected_element {
            if let Some(track) = project.scene.tracks.get(ti) {
                if let Some(element) = track.elements.get(ei) {
                    draw_text_left(hdc, "Clip Properties", &header, TEXT_DIM);
                    let fields: [(&str, String); 5] = [
                        ("Name", element.name.clone()),
                        ("ID", element.id.clone()),
                        ("Track", track.name.clone()),
                        ("Start", format!("{:.2}s", element.start_seconds)),
                        ("Duration", format!("{:.2}s", element.duration_seconds)),
                    ];
                    for (label, value) in &fields {
                        if y + PROP_ROW_H > panel.bottom {
                            break;
                        }
                        let label_rect = RECT {
                            left,
                            top: y,
                            right: left + 70,
                            bottom: y + PROP_ROW_H,
                        };
                        draw_text_left(hdc, label, &label_rect, TEXT_FAINT);
                        let value_rect = RECT {
                            left: left + 78,
                            top: y,
                            right,
                            bottom: y + PROP_ROW_H,
                        };
                        draw_text_left(hdc, value, &value_rect, TEXT_DIM);
                        y += PROP_ROW_H;
                    }
                    if y + PROP_ROW_H <= panel.bottom {
                        let hint_rect = RECT {
                            left,
                            top: y + 8,
                            right,
                            bottom: y + PROP_ROW_H + 8,
                        };
                        draw_text_left(hdc, "Del = remove clip", &hint_rect, TEXT_FAINT);
                    }
                    return;
                }
            }
        }

        // Project properties (no clip selected).
        draw_text_left(hdc, "Properties", &header, TEXT_DIM);

        let duration = timeline_duration(project);
        let fields: [(&str, String); 8] = [
            ("Name", format!("{}  (Ctrl+R)", project.metadata.name)),
            ("ID", project.metadata.id.clone()),
            ("Version", format!("v{}", project.version)),
            ("Duration", format!("{:.1}s", duration)),
            (
                "Canvas",
                format!(
                    "{}\u{00D7}{}",
                    project.settings.canvas.width, project.settings.canvas.height
                ),
            ),
            ("FPS", format!("{}", project.settings.fps_label())),
            ("Aspect", project.settings.canvas.aspect_label()),
            (
                "Tracks / Assets",
                format!("{} / {}", project.scene.tracks.len(), project.assets.len()),
            ),
        ];

        for (label, value) in &fields {
            if y + PROP_ROW_H > panel.bottom {
                break;
            }
            let label_rect = RECT {
                left,
                top: y,
                right: left + 70,
                bottom: y + PROP_ROW_H,
            };
            draw_text_left(hdc, label, &label_rect, TEXT_FAINT);

            let value_rect = RECT {
                left: left + 78,
                top: y,
                right,
                bottom: y + PROP_ROW_H,
            };
            draw_text_left(hdc, value, &value_rect, TEXT_DIM);
            y += PROP_ROW_H;
        }
    }
}
