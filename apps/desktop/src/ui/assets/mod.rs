//! Assets panel — media library, effects library, and adjustments.
//!
//! Mirrors the web app's `panels/assets/`. Contains tabbed views for
//! media assets, effects, adjustments, text, and transitions. For the
//! desktop app, we focus on the effects library (wired to the Rust
//! effects crate shaders) and the media library (imported files).

pub mod effects;

use gpui::{Entity, IntoElement, ParentElement, Styled, div, prelude::*, px};

use crate::app::ArtidorApp;
use crate::theme;

/// The active assets tab.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AssetsTab {
    Media,
    Effects,
    Adjustments,
    Text,
    Transitions,
}

impl AssetsTab {
    fn label(&self) -> &str {
        match self {
            Self::Media => "Media",
            Self::Effects => "Effects",
            Self::Adjustments => "Adjust",
            Self::Text => "Text",
            Self::Transitions => "Transitions",
        }
    }
}

const TABS: &[AssetsTab] = &[
    AssetsTab::Media,
    AssetsTab::Effects,
    AssetsTab::Adjustments,
    AssetsTab::Text,
    AssetsTab::Transitions,
];

/// Builds the assets panel element.
pub fn build_assets_panel(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    let mut panel = div()
        .w_full()
        .h_full()
        .bg(theme::BG_PANEL)
        .flex()
        .flex_col();

    // Tab bar
    let mut tab_bar = div()
        .h(theme::TIMELINE_TOOLBAR_HEIGHT)
        .w_full()
        .bg(theme::BG_PANEL_RAISED)
        .border_b_1()
        .border_color(theme::BORDER)
        .flex()
        .flex_row()
        .items_center()
        .px(theme::px_4());

    for tab in TABS {
        tab_bar = tab_bar.child(tab_button(*tab));
    }

    panel = panel.child(tab_bar);

    // Content area — show the effects library for now (most useful for desktop).
    panel = panel.child(
        div()
            .flex_1()
            .min_h_0()
            .id("assets-content")
            .overflow_scroll()
            .p(theme::px_8())
            .child(effects::build_effects_library(app, entity)),
    );

    panel
}

/// A tab button.
fn tab_button(tab: AssetsTab) -> impl IntoElement {
    div()
        .px(theme::px_8())
        .py(theme::px_4())
        .rounded(px(3.0))
        .text_color(theme::TEXT_MUTED)
        .text_size(px(11.0))
        .hover(|s| s.bg(theme::BG_HOVER).text_color(theme::TEXT_PRIMARY))
        .child(tab.label().to_string())
}
