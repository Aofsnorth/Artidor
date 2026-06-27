//! Editor layout — assembles all panels into the root layout tree.
//!
//! Called from `ArtidorApp::render()` where we have direct access to the
//! app state and GPUI context. Each panel is a free function that reads
//! from `&ArtidorApp` and returns a `div()` element tree.

use gpui::{div, Entity, ParentElement, Styled, prelude::*};

use crate::app::ArtidorApp;
use crate::theme;
use crate::ui::assets::build_assets_panel;
use crate::ui::footer::build_footer;
use crate::ui::header::build_header;
use crate::ui::inspector::build_inspector_panel;
use crate::ui::timeline::build_timeline_panel;
use crate::ui::toolbar::build_toolbar;
use crate::ui::viewport_panel::build_viewport_panel;
use crate::ui::ai::build_ai_copilot_panel;

use std::sync::Arc;

/// Builds the full editor layout element tree.
///
/// This is called from `ArtidorApp::render()` and receives the entity
/// handle (for interactivity closures) and the cached viewport image.
pub fn build_layout(
    app: &ArtidorApp,
    entity: Entity<ArtidorApp>,
    cached_image: Option<Arc<gpui::RenderImage>>,
) -> impl IntoElement {
    div()
        .size_full()
        .bg(theme::BG_APP)
        .flex()
        .flex_col()
        // Header
        .child(build_header(app, entity.clone()))
        // Middle row: toolbar + assets + viewport + inspector + AI
        .child(
            div()
                .flex_1()
                .min_h_0()
                .flex()
                .flex_row()
                .child(build_toolbar(app, entity.clone()))
                .when(app.state.panels.assets, |d| {
                    d.child(
                        div()
                            .w(theme::ASSETS_WIDTH)
                            .h_full()
                            .bg(theme::BG_PANEL)
                            .border_r_1()
                            .border_color(theme::BORDER)
                            .child(build_assets_panel(app, entity.clone())),
                    )
                })
                .child(build_viewport_panel(app, entity.clone(), cached_image))
                .when(app.state.panels.inspector, |d| {
                    d.child(
                        div()
                            .w(theme::INSPECTOR_WIDTH)
                            .h_full()
                            .bg(theme::BG_PANEL)
                            .border_l_1()
                            .border_color(theme::BORDER)
                            .child(build_inspector_panel(app, entity.clone())),
                    )
                })
                .when(app.state.panels.ai_copilot, |d| {
                    d.child(
                        div()
                            .w(theme::ASSETS_WIDTH)
                            .h_full()
                            .bg(theme::BG_PANEL)
                            .border_l_1()
                            .border_color(theme::BORDER)
                            .child(build_ai_copilot_panel(app, entity.clone())),
                    )
                }),
        )
        // Timeline
        .when(app.state.panels.timeline, |d| {
            d.child(
                div()
                    .h(theme::TIMELINE_HEIGHT)
                    .w_full()
                    .bg(theme::BG_PANEL)
                    .border_t_1()
                    .border_color(theme::BORDER)
                    .child(build_timeline_panel(app, entity.clone())),
            )
        })
        // Footer
        .child(build_footer(app, entity))
}
