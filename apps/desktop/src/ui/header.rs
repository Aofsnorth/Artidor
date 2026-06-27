//! Header bar — project name, save status, and action buttons.
//!
//! Mirrors the web app's `editor-header.tsx`. Contains the project title,
//! a dirty indicator, and buttons for import, save, and export.

use gpui::prelude::*;
use gpui::{
    div, px, App, ClickEvent, Entity, IntoElement, ParentElement, SharedString, Styled, Window,
};

use crate::app::ArtidorApp;
use crate::theme;

/// Builds the header bar element.
pub fn build_header(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    let project_name: SharedString = app.state.project.name.clone().into();
    let dirty_text: SharedString = if app.state.dirty { "●".into() } else { "".into() };
    let fps = app.state.project.fps();
    let resolution = format!("{}×{}", app.state.project.width, app.state.project.height);
    let fps_text: SharedString = format!("{fps:.2} fps").into();
    let res_text: SharedString = resolution.into();

    div()
        .h(theme::HEADER_HEIGHT)
        .w_full()
        .bg(theme::BG_PANEL)
        .border_b_1()
        .border_color(theme::BORDER)
        .flex()
        .flex_row()
        .items_center()
        .px(theme::px_16())
        // Left: logo + project name
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(theme::px_8())
                .child(
                    div()
                        .text_color(theme::TEXT_ACCENT)
                        .text_size(px(16.0))
                        .font_weight(gpui::FontWeight::BOLD)
                        .child("Artidor"),
                )
                .child(div().w(px(1.0)).h(px(20.0)).bg(theme::BORDER))
                .child(
                    div()
                        .text_color(theme::TEXT_PRIMARY)
                        .text_size(px(13.0))
                        .child(project_name),
                )
                .child(
                    div()
                        .text_color(theme::WARNING)
                        .text_size(px(10.0))
                        .child(dirty_text),
                ),
        )
        // Center: resolution + fps
        .child(
            div()
                .flex_1()
                .flex()
                .justify_center()
                .items_center()
                .gap(theme::px_12())
                .child(
                    div()
                        .text_color(theme::TEXT_MUTED)
                        .text_size(px(11.0))
                        .child(res_text),
                )
                .child(
                    div()
                        .text_color(theme::TEXT_MUTED)
                        .text_size(px(11.0))
                        .child(fps_text),
                ),
        )
        // Right: action buttons
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(theme::px_4())
                .child(header_button("Import", entity.clone(), HeaderAction::Import))
                .child(header_button("Save", entity.clone(), HeaderAction::Save))
                .child(header_button("Export", entity, HeaderAction::Export)),
        )
}

/// Which header action to perform.
enum HeaderAction {
    Import,
    Save,
    Export,
}

/// A header action button that directly calls the entity's handler.
fn header_button(
    label: &str,
    entity: Entity<ArtidorApp>,
    action: HeaderAction,
) -> impl IntoElement {
    let btn_id: gpui::SharedString = label.to_string().into();
    div()
        .px(theme::px_12())
        .py(theme::px_6())
        .rounded(px(4.0))
        .bg(theme::BG_PANEL_RAISED)
        .text_color(theme::TEXT_SECONDARY)
        .text_size(px(12.0))
        .hover(|s| s.bg(theme::BG_HOVER).text_color(theme::TEXT_PRIMARY))
        .child(label.to_string())
        .id(btn_id)
        .on_click(move |_: &ClickEvent, _window: &mut Window, cx: &mut App| {
            entity.update(cx, |app, cx| {
                match action {
                    HeaderAction::Import => app.handle_import_media(cx),
                    HeaderAction::Save => app.handle_save_project(cx),
                    HeaderAction::Export => app.handle_export(cx),
                }
            });
        })
}
