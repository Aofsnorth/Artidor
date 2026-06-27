//! Inspector panel — properties of the selected element.
//!
//! Mirrors the web app's `panels/properties/`. Shows transform properties
//! (position, size, rotation, opacity), blend mode, and effect list for
//! the currently selected element. If nothing is selected, shows project
//! properties (canvas size, frame rate, background color).

pub mod properties;

use gpui::{Entity, IntoElement, ParentElement, Styled, div, prelude::*, px};

use crate::app::ArtidorApp;
use crate::theme;

/// Builds the inspector panel element.
pub fn build_inspector_panel(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    let mut panel = div()
        .w_full()
        .h_full()
        .bg(theme::BG_PANEL)
        .flex()
        .flex_col()
        .id("inspector")
        .overflow_scroll();

    // Panel header — matches web PropertiesPanel header style.
    panel = panel.child(
        div()
            .h(px(40.0))
            .w_full()
            .flex()
            .items_center()
            .justify_between()
            .px(px(12.0))
            .border_b_1()
            .border_color(theme::BORDER)
            .child(
                div()
                    .text_size(px(12.0))
                    .font_weight(gpui::FontWeight::SEMIBOLD)
                    .text_color(theme::TEXT_PRIMARY)
                    .child("Properties"),
            )
            .child(
                div()
                    .text_size(px(10.0))
                    .text_color(theme::TEXT_FAINT)
                    .child("⋯"),
            ),
    );

    // Content: element properties or project properties.
    if app.state.selection.element_ids.len() == 1 {
        let element_id = &app.state.selection.element_ids[0];
        if let Some((_, element)) = app.state.project.find_element(element_id) {
            panel = panel.child(properties::build_element_properties(element, entity));
        } else {
            panel = panel.child(empty_state("Element not found"));
        }
    } else if app.state.selection.element_ids.len() > 1 {
        panel = panel.child(empty_state("Multiple elements selected"));
    } else {
        panel = panel.child(properties::build_project_properties(
            &app.state.project,
            entity,
        ));
    }

    panel
}

/// A placeholder for when nothing is selected.
fn empty_state(message: &str) -> impl IntoElement {
    div()
        .flex_1()
        .flex()
        .items_center()
        .justify_center()
        .p(theme::px_16())
        .child(
            div()
                .text_color(theme::TEXT_MUTED)
                .text_size(px(12.0))
                .child(message.to_string()),
        )
}
