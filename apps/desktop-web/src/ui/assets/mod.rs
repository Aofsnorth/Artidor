//! Assets panel — content area that switches based on the active tab.
//!
//! Mirrors the web app's `panels/assets/index.tsx`. The tab selection
//! happens in the vertical tab bar (`ui/tab_bar.rs`), so this panel only
//! renders the content for the currently active tab (from
//! `app.state.panels.active_tab`).

pub mod effects;

use gpui::{
    Entity, InteractiveElement, IntoElement, ParentElement, StatefulInteractiveElement, Styled,
    div, px,
};

use crate::app::ArtidorApp;
use crate::state::editor_state::AssetsTab;
use crate::theme;

/// Builds the assets panel element — a header with the active tab name
/// and a scrollable content area.
pub fn build_assets_panel(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    let active_tab = app.state.panels.active_tab;
    let header_label = active_tab.label().to_string();

    div()
        .w_full()
        .h_full()
        .flex()
        .flex_col()
        // Header — tab name + search placeholder
        .child(
            div()
                .h(px(40.0))
                .w_full()
                .flex()
                .flex_row()
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
                        .child(header_label),
                )
                .child(
                    div()
                        .text_size(px(11.0))
                        .text_color(theme::TEXT_FAINT)
                        .child("⌕"),
                ),
        )
        // Content area — switches based on active tab
        .child(build_tab_content(app, entity, active_tab))
}

/// Builds the content area for the given active tab.
fn build_tab_content(
    app: &ArtidorApp,
    entity: Entity<ArtidorApp>,
    tab: AssetsTab,
) -> impl IntoElement {
    let mut content = div()
        .flex_1()
        .min_h_0()
        .id("assets-content")
        .overflow_scroll()
        .p(px(8.0));

    match tab {
        AssetsTab::Effects | AssetsTab::Overlays => {
            content = content.child(effects::build_effects_library(app, entity));
        }
        AssetsTab::Assets | AssetsTab::Elements => {
            content = content.child(build_media_grid(app));
        }
        AssetsTab::Text => {
            content = content.child(build_placeholder("Text elements — click to add"));
        }
        AssetsTab::Transitions => {
            content = content.child(build_placeholder("Transitions library"));
        }
        AssetsTab::Audio => {
            content = content.child(build_placeholder("Audio library"));
        }
        AssetsTab::Motion => {
            content = content.child(build_placeholder("Motion presets"));
        }
        AssetsTab::Adjust => {
            content = content.child(build_placeholder("Adjustments"));
        }
        AssetsTab::Templates => {
            content = content.child(build_placeholder("Templates"));
        }
        AssetsTab::Presets => {
            content = content.child(build_placeholder("Presets"));
        }
        AssetsTab::Tools => {
            content = content.child(build_placeholder("Quick tools"));
        }
        AssetsTab::Plugins => {
            content = content.child(build_placeholder("Plugins"));
        }
        AssetsTab::Captions => {
            content = content.child(build_placeholder("Captions"));
        }
        AssetsTab::Scripting => {
            content = content.child(build_placeholder("Scripting"));
        }
        AssetsTab::Settings => {
            content = content.child(build_placeholder("Settings"));
        }
        AssetsTab::Ai => {
            content = content.child(build_placeholder("AI assistant"));
        }
    }

    content
}

/// Builds a simple media grid showing imported media entries, or a
/// placeholder if no media has been imported yet.
fn build_media_grid(app: &ArtidorApp) -> impl IntoElement {
    if app.state.media_registry.is_empty() {
        return div()
            .w_full()
            .h_full()
            .flex()
            .items_center()
            .justify_center()
            .text_size(px(11.0))
            .text_color(theme::TEXT_MUTED)
            .child("No media imported yet");
    }

    let mut grid = div().flex().flex_col().gap(px(6.0));

    for entry in &app.state.media_registry {
        let name = entry
            .path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown");
        let dims = format!("{}×{}", entry.width, entry.height);

        grid = grid.child(
            div()
                .w_full()
                .h(px(48.0))
                .rounded(px(8.0))
                .border_1()
                .border_color(theme::BORDER)
                .bg(theme::BG_PANEL_RAISED)
                .flex()
                .flex_row()
                .items_center()
                .gap(px(8.0))
                .px(px(8.0))
                .hover(|s| s.bg(theme::BG_HOVER))
                .child(
                    div()
                        .w(px(32.0))
                        .h(px(32.0))
                        .rounded(px(4.0))
                        .bg(theme::BG_APP)
                        .flex()
                        .items_center()
                        .justify_center()
                        .text_size(px(10.0))
                        .text_color(theme::TEXT_FAINT)
                        .child("▦"),
                )
                .child(
                    div()
                        .flex_1()
                        .flex()
                        .flex_col()
                        .child(
                            div()
                                .text_size(px(11.0))
                                .text_color(theme::TEXT_PRIMARY)
                                .child(name.to_string()),
                        )
                        .child(
                            div()
                                .text_size(px(9.0))
                                .text_color(theme::TEXT_MUTED)
                                .child(dims),
                        ),
                ),
        );
    }

    grid
}

/// Builds a centered placeholder message for tabs without content yet.
fn build_placeholder(message: &str) -> gpui::Div {
    div()
        .w_full()
        .h_full()
        .flex()
        .items_center()
        .justify_center()
        .text_size(px(11.0))
        .text_color(theme::TEXT_MUTED)
        .child(message.to_string())
}
