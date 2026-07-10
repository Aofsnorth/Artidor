//! Inspector panel — project/clip properties.
//!
//! Shows clip properties when a clip is selected, project properties
//! otherwise. Mirrors `apps/desktop-web/src/ui/inspector/mod.rs`.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::Project;
use crate::theme::{
    ACCENT_BG, ACCENT_SUBTLE, BORDER_FAINT, PROP_PAD, PROP_ROW_H, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT,
};
use crate::ui::gfx::{draw_text_left, rounded_border_rect, rounded_fill_rect};
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
                    rounded_fill_rect(hdc, &header, ACCENT_BG, 6);
                    rounded_border_rect(hdc, &header, BORDER_FAINT, 6);
                    draw_text_left(hdc, "Clip Properties", &header, TEXT_BRIGHT);

                    // Basic info section.
                    let basic_fields: [(&str, String); 5] = [
                        ("Name", element.name.clone()),
                        ("ID", element.id.clone()),
                        ("Track", track.name.clone()),
                        ("Start", format!("{:.2}s", element.start_seconds)),
                        ("Duration", format!("{:.2}s", element.duration_seconds)),
                    ];
                    for (label, value) in &basic_fields {
                        if y + PROP_ROW_H > panel.bottom {
                            break;
                        }
                        draw_property_row(hdc, left, right, y, label, value);
                        y += PROP_ROW_H;
                    }

                    // Transform section header.
                    if y + PROP_ROW_H <= panel.bottom {
                        let sect_rect = RECT {
                            left,
                            top: y + 4,
                            right,
                            bottom: y + PROP_ROW_H + 4,
                        };
                        rounded_fill_rect(hdc, &sect_rect, ACCENT_BG, 4);
                        rounded_border_rect(hdc, &sect_rect, BORDER_FAINT, 4);
                        draw_text_left(hdc, "Transform", &sect_rect, TEXT_BRIGHT);
                        y += PROP_ROW_H + 8;
                    }

                    // Transform properties.
                    let transform_fields: [(&str, String); 7] = [
                        ("Pos X", format!("{:.3}", element.transform.center_x)),
                        ("Pos Y", format!("{:.3}", element.transform.center_y)),
                        ("Width", format!("{:.3}", element.transform.width)),
                        ("Height", format!("{:.3}", element.transform.height)),
                        (
                            "Rotation",
                            format!("{:.1}\u{00B0}", element.transform.rotation_degrees),
                        ),
                        (
                            "Flip X",
                            if element.transform.flip_x {
                                "Yes"
                            } else {
                                "No"
                            }
                            .to_string(),
                        ),
                        (
                            "Flip Y",
                            if element.transform.flip_y {
                                "Yes"
                            } else {
                                "No"
                            }
                            .to_string(),
                        ),
                    ];
                    for (label, value) in &transform_fields {
                        if y + PROP_ROW_H > panel.bottom {
                            break;
                        }
                        draw_property_row(hdc, left, right, y, label, value);
                        y += PROP_ROW_H;
                    }

                    // Compositing section.
                    if y + PROP_ROW_H <= panel.bottom {
                        let sect_rect = RECT {
                            left,
                            top: y + 4,
                            right,
                            bottom: y + PROP_ROW_H + 4,
                        };
                        rounded_fill_rect(hdc, &sect_rect, ACCENT_BG, 4);
                        rounded_border_rect(hdc, &sect_rect, BORDER_FAINT, 4);
                        draw_text_left(hdc, "Compositing", &sect_rect, TEXT_BRIGHT);
                        y += PROP_ROW_H + 8;
                    }

                    let comp_fields: [(&str, String); 2] = [
                        ("Opacity", format!("{:.0}%", element.opacity * 100.0)),
                        ("Blend", element.blend_mode.label().to_string()),
                    ];
                    for (label, value) in &comp_fields {
                        if y + PROP_ROW_H > panel.bottom {
                            break;
                        }
                        draw_property_row(hdc, left, right, y, label, value);
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
        rounded_fill_rect(hdc, &header, ACCENT_BG, 6);
        rounded_border_rect(hdc, &header, BORDER_FAINT, 6);
        draw_text_left(hdc, "Properties", &header, TEXT_BRIGHT);

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
            draw_property_row(hdc, left, right, y, label, value);
            y += PROP_ROW_H;
        }
    }
}

/// Draw a single property row: a subtle rounded background with the label
/// on the left and the value on the right.
unsafe fn draw_property_row(hdc: HDC, left: i32, right: i32, y: i32, label: &str, value: &str) {
    unsafe {
        let row = RECT {
            left,
            top: y,
            right,
            bottom: y + PROP_ROW_H,
        };
        rounded_fill_rect(hdc, &row, ACCENT_SUBTLE, 4);
        let label_rect = RECT {
            left: left + 4,
            top: y,
            right: left + 70,
            bottom: y + PROP_ROW_H,
        };
        draw_text_left(hdc, label, &label_rect, TEXT_FAINT);
        let value_rect = RECT {
            left: left + 78,
            top: y,
            right: right - 4,
            bottom: y + PROP_ROW_H,
        };
        draw_text_left(hdc, value, &value_rect, TEXT_DIM);
    }
}
