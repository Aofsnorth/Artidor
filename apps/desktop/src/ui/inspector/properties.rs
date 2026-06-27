//! Properties views — element and project property editors.
//!
//! Each property is rendered as a label + value row. Editing is done via
//! text inputs (future) or drag-to-adjust (future). For now, properties
//! are displayed read-only with clear labels.

use gpui::{div, px, Entity, IntoElement, ParentElement, Styled};

use crate::app::ArtidorApp;
use crate::state::project::{Element, Project};
use crate::theme;

/// Builds the element properties section.
pub fn build_element_properties(element: &Element, _entity: Entity<ArtidorApp>) -> impl IntoElement {
    let mut container = div()
        .w_full()
        .flex()
        .flex_col()
        .p(theme::px_12())
        .gap(theme::px_12());

    // Element header
    container = container.child(
        div()
            .flex()
            .flex_col()
            .gap(theme::px_4())
            .child(
                div()
                    .text_color(theme::TEXT_PRIMARY)
                    .text_size(px(14.0))
                    .font_weight(gpui::FontWeight::BOLD)
                    .child(element.name.clone()),
            )
            .child(
                div()
                    .text_color(theme::TEXT_MUTED)
                    .text_size(px(11.0))
                    .child(format!("{:?}", element.element_type)),
            ),
    );

    // Transform section
    container = container.child(section("Transform", {
        let mut s = div().flex().flex_col().gap(theme::px_4());
        s = s.child(property_row("Position X", format!("{:.3}", element.transform.center_x)));
        s = s.child(property_row("Position Y", format!("{:.3}", element.transform.center_y)));
        s = s.child(property_row("Width", format!("{:.3}", element.transform.width)));
        s = s.child(property_row("Height", format!("{:.3}", element.transform.height)));
        s = s.child(property_row("Rotation", format!("{:.1}°", element.transform.rotation_degrees)));
        s = s.child(property_row("Flip X", if element.transform.flip_x { "Yes".to_string() } else { "No".to_string() }));
        s = s.child(property_row("Flip Y", if element.transform.flip_y { "Yes".to_string() } else { "No".to_string() }));
        s
    }));

    // Appearance section
    container = container.child(section("Appearance", {
        let mut s = div().flex().flex_col().gap(theme::px_4());
        s = s.child(property_row("Opacity", format!("{:.0}%", element.opacity * 100.0)));
        s = s.child(property_row("Blend Mode", format!("{:?}", element.blend_mode)));
        s
    }));

    // Timing section
    container = container.child(section("Timing", {
        let mut s = div().flex().flex_col().gap(theme::px_4());
        s = s.child(property_row("Start Frame", format!("{}", element.start_frame)));
        s = s.child(property_row("Duration", format!("{} frames", element.duration_frames)));
        s = s.child(property_row("End Frame", format!("{}", element.end_frame())));
        s
    }));

    // Effects section
    let effect_count = element.effect_pass_groups.iter().map(|g| g.len()).sum::<usize>();
    container = container.child(section("Effects", {
        div()
            .text_color(theme::TEXT_SECONDARY)
            .text_size(px(11.0))
            .child(format!("{effect_count} effect pass(es)"))
    }));

    // Mask section
    if element.mask.is_some() {
        container = container.child(section("Mask", {
            div()
                .text_color(theme::TEXT_SECONDARY)
                .text_size(px(11.0))
                .child("Mask applied")
        }));
    }

    container
}

/// Builds the project properties section (shown when no element is selected).
pub fn build_project_properties(project: &Project, _entity: Entity<ArtidorApp>) -> impl IntoElement {
    let mut container = div()
        .w_full()
        .flex()
        .flex_col()
        .p(theme::px_12())
        .gap(theme::px_12());

    container = container.child(
        div()
            .text_color(theme::TEXT_PRIMARY)
            .text_size(px(14.0))
            .font_weight(gpui::FontWeight::BOLD)
            .child("Project Settings"),
    );

    container = container.child(section("Canvas", {
        let mut s = div().flex().flex_col().gap(theme::px_4());
        s = s.child(property_row("Width", format!("{} px", project.width)));
        s = s.child(property_row("Height", format!("{} px", project.height)));
        s = s.child(property_row("Frame Rate", format!("{:.2} fps", project.fps())));
        s
    }));

    container = container.child(section("Content", {
        let mut s = div().flex().flex_col().gap(theme::px_4());
        s = s.child(property_row("Tracks", format!("{}", project.tracks.len())));
        s = s.child(property_row("Total Frames", format!("{}", project.total_frames())));
        s = s.child(property_row("Duration", format!("{:.2}s", project.total_frames() as f64 / project.fps())));
        s
    }));

    container = container.child(section("Background", {
        let [r, g, b, a] = project.background_color;
        div()
            .flex()
            .flex_row()
            .items_center()
            .gap(theme::px_8())
            .child(
                div()
                    .w(px(24.0))
                    .h(px(24.0))
                    .rounded(px(3.0))
                    .bg(gpui::rgba(
                        (r * 255.0) as u32 * 0x10000
                            | (g * 255.0) as u32 * 0x100
                            | (b * 255.0) as u32,
                    )),
            )
            .child(
                div()
                    .text_color(theme::TEXT_SECONDARY)
                    .text_size(px(11.0))
                    .child(format!("R:{:.0} G:{:.0} B:{:.0} A:{:.0}", r * 255.0, g * 255.0, b * 255.0, a * 255.0)),
            )
    }));

    container
}

/// A labeled section with a header.
fn section(title: &str, content: impl IntoElement) -> impl IntoElement {
    div()
        .w_full()
        .flex()
        .flex_col()
        .gap(theme::px_6())
        .child(
            div()
                .text_color(theme::TEXT_SECONDARY)
                .text_size(px(10.0))
                .font_weight(gpui::FontWeight::BOLD)
                .child(title.to_string()),
        )
        .child(content)
}

/// A property label + value row.
fn property_row(label: &str, value: String) -> impl IntoElement {
    div()
        .w_full()
        .flex()
        .flex_row()
        .items_center()
        .justify_between()
        .child(
            div()
                .text_color(theme::TEXT_MUTED)
                .text_size(px(11.0))
                .child(label.to_string()),
        )
        .child(
            div()
                .text_color(theme::TEXT_PRIMARY)
                .text_size(px(11.0))
                .child(value),
        )
}
