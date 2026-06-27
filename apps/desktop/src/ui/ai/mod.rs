//! AI copilot panel — chat interface for the AI assistant.
//!
//! Mirrors the web app's AI copilot/takeover feature. The desktop version
//! provides a chat interface that connects to the same AI backend. The
//! takeover/permission system and aurora overlay are future enhancements.

use gpui::{Entity, IntoElement, ParentElement, Styled, div, px};

use crate::app::ArtidorApp;
use crate::theme;

/// Builds the AI copilot panel element.
pub fn build_ai_copilot_panel(_app: &ArtidorApp, _entity: Entity<ArtidorApp>) -> impl IntoElement {
    let mut panel = div()
        .w_full()
        .h_full()
        .bg(theme::BG_PANEL)
        .flex()
        .flex_col();

    // Header
    panel = panel.child(
        div()
            .h(theme::TIMELINE_TOOLBAR_HEIGHT)
            .w_full()
            .bg(theme::BG_PANEL_RAISED)
            .border_b_1()
            .border_color(theme::BORDER)
            .flex()
            .items_center()
            .px(theme::px_12())
            .gap(theme::px_6())
            .child(div().w(px(8.0)).h(px(8.0)).rounded_full().bg(theme::ACCENT))
            .child(
                div()
                    .text_color(theme::TEXT_SECONDARY)
                    .text_size(px(11.0))
                    .child("AI Copilot"),
            ),
    );

    // Chat area (placeholder — empty conversation).
    panel = panel.child(
        div()
            .flex_1()
            .min_h_0()
            .flex()
            .flex_col()
            .items_center()
            .justify_center()
            .p(theme::px_16())
            .gap(theme::px_12())
            .child(
                div()
                    .text_color(theme::TEXT_MUTED)
                    .text_size(px(13.0))
                    .child("AI Copilot"),
            )
            .child(
                div()
                    .text_color(theme::TEXT_MUTED)
                    .text_size(px(11.0))
                    .text_center()
                    .child("Ask me to edit your video, apply effects, or help with your project. The copilot connects to the same AI backend as the web app."),
            ),
    );

    // Input area (placeholder).
    panel = panel.child(
        div()
            .w_full()
            .p(theme::px_12())
            .border_t_1()
            .border_color(theme::BORDER)
            .child(
                div()
                    .w_full()
                    .h(px(36.0))
                    .rounded(px(6.0))
                    .bg(theme::BG_INPUT)
                    .border_1()
                    .border_color(theme::BORDER)
                    .flex()
                    .items_center()
                    .px(theme::px_12())
                    .text_color(theme::TEXT_MUTED)
                    .text_size(px(12.0))
                    .child("Type a message… (AI integration coming soon)"),
            ),
    );

    panel
}
