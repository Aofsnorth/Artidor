//! Editor layout — assembles all panels into the root layout tree.
//!
//! Mirrors the web app's `EditorLayout` + `EditorPanels` structure:
//!
//! ```text
//! ┌──────────────────────────────────────────────┐
//! │ Header (48px)                                │
//! ├──────┬───────────────┬──────────┬───────────┤
//! │ Tab  │   Preview      │ Assets  │ Properties │
//! │ Bar  │   (viewport +  │ Panel   │  Panel     │
//! │ 72px │    toolbar)    │         │            │
//! │      ├───────────────┴──────────┴───────────┤
//! │      │   Timeline                          │
//! ├──────┴──────────────────────────────────────┤
//! │ Footer (36px)                                │
//! └──────────────────────────────────────────────┘
//! ```
//!
//! The tab bar, preview, assets, properties, and timeline panels are
//! all rounded-xl cards with `border-white/10`, separated by an 8px gap
//! (matching the web's `gap-2 p-2 pt-0`).

use gpui::{Entity, ParentElement, Styled, div, prelude::*, px};

use crate::app::ArtidorApp;
use crate::theme;
use crate::ui::ai::build_ai_copilot_panel;
use crate::ui::assets::build_assets_panel;
use crate::ui::footer::build_footer;
use crate::ui::header::build_header;
use crate::ui::inspector::build_inspector_panel;
use crate::ui::tab_bar::build_tab_bar;
use crate::ui::timeline::build_timeline_panel;
use crate::ui::viewport_panel::build_viewport_panel;

use std::sync::Arc;

/// Gap between panels (matches web `gap-2` = 8px).
const PANEL_GAP: gpui::Pixels = px(8.0);
/// Outer padding around the panel area (matches web `p-2`).
const PANEL_PADDING: gpui::Pixels = px(8.0);

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
        // Header (48px) — full width, no border (matches web which uses
        // a radial glow + hairline instead of a hard border).
        .child(build_header(app, entity.clone()))
        // Middle: panel area with gap-2 p-2 pt-0
        .child(
            div()
                .flex_1()
                .min_h_0()
                .flex()
                .flex_row()
                .gap(PANEL_GAP)
                .pl(PANEL_PADDING)
                .pr(PANEL_PADDING)
                .pb(PANEL_PADDING)
                // Left: vertical tab bar (72px)
                .child(build_tab_bar(app, entity.clone()))
                // Right: the panel grid (assets | preview | properties on top,
                // timeline on bottom).
                .child(
                    div()
                        .flex_1()
                        .min_w_0()
                        .flex()
                        .flex_col()
                        .gap(PANEL_GAP)
                        // Top row: assets | preview | properties | AI copilot
                        .child(
                            div()
                                .flex_1()
                                .min_h_0()
                                .flex()
                                .flex_row()
                                .gap(PANEL_GAP)
                                .when(app.state.panels.assets, |d| {
                                    d.child(build_assets_card(app, entity.clone()))
                                })
                                .child(build_preview_card(app, entity.clone(), cached_image))
                                .when(app.state.panels.inspector, |d| {
                                    d.child(build_properties_card(app, entity.clone()))
                                })
                                .when(app.state.panels.ai_copilot, |d| {
                                    d.child(build_ai_card(app, entity.clone()))
                                }),
                        )
                        // Bottom: timeline
                        .when(app.state.panels.timeline, |d| {
                            d.child(build_timeline_card(app, entity.clone()))
                        }),
                ),
        )
        // Footer (36px)
        .child(build_footer(app, entity))
}

/// A rounded panel card wrapper — `rounded-xl border border-white/10
/// overflow-hidden` matching the web's `panel glass-strong` class.
fn panel_card() -> gpui::Div {
    div()
        .rounded(px(12.0))
        .border_1()
        .border_color(theme::BORDER)
        .overflow_hidden()
}

/// Assets panel card.
fn build_assets_card(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    panel_card()
        .w(theme::ASSETS_WIDTH)
        .h_full()
        .bg(theme::BG_PANEL)
        .child(build_assets_panel(app, entity))
}

/// Preview panel card (viewport + toolbar).
fn build_preview_card(
    app: &ArtidorApp,
    entity: Entity<ArtidorApp>,
    cached_image: Option<Arc<gpui::RenderImage>>,
) -> impl IntoElement {
    panel_card()
        .flex_1()
        .min_w_0()
        .h_full()
        .bg(theme::BG_VIEWPORT)
        .child(build_viewport_panel(app, entity, cached_image))
}

/// Properties panel card.
fn build_properties_card(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    panel_card()
        .w(theme::INSPECTOR_WIDTH)
        .h_full()
        .bg(theme::BG_PANEL)
        .child(build_inspector_panel(app, entity))
}

/// AI copilot panel card.
fn build_ai_card(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    panel_card()
        .w(theme::ASSETS_WIDTH)
        .h_full()
        .bg(theme::BG_PANEL)
        .child(build_ai_copilot_panel(app, entity))
}

/// Timeline panel card.
fn build_timeline_card(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    panel_card()
        .h(theme::TIMELINE_HEIGHT)
        .w_full()
        .bg(theme::BG_PANEL)
        .child(build_timeline_panel(app, entity))
}
