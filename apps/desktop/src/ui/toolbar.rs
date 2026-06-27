//! Left toolbar — tool selection icons.
//!
//! Mirrors the web app's preview toolbar. Contains buttons for the
//! selection tool, hand/pan tool, text tool, shape tools, and mask tool.

use gpui::{div, px, Entity, IntoElement, ParentElement, Styled, prelude::*};

use crate::app::ArtidorApp;
use crate::theme;

/// The currently active tool.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tool {
    Select,
    Hand,
    Text,
    Rectangle,
    Ellipse,
    Mask,
    Draw,
    Eraser,
}

impl Default for Tool {
    fn default() -> Self {
        Self::Select
    }
}

impl Tool {
    fn icon(&self) -> &str {
        match self {
            Self::Select => "[]",
            Self::Hand => "H",
            Self::Text => "T",
            Self::Rectangle => "R",
            Self::Ellipse => "O",
            Self::Mask => "M",
            Self::Draw => "D",
            Self::Eraser => "E",
        }
    }
}

/// All tools in toolbar order.
const TOOLS: &[Tool] = &[
    Tool::Select,
    Tool::Hand,
    Tool::Text,
    Tool::Rectangle,
    Tool::Ellipse,
    Tool::Mask,
    Tool::Draw,
    Tool::Eraser,
];

/// Builds the left toolbar element.
pub fn build_toolbar(_app: &ArtidorApp, _entity: Entity<ArtidorApp>) -> impl IntoElement {
    let mut container = div()
        .w(theme::TOOLBAR_WIDTH)
        .h_full()
        .bg(theme::BG_PANEL)
        .border_r_1()
        .border_color(theme::BORDER)
        .flex()
        .flex_col()
        .items_center()
        .py(theme::px_8())
        .gap(theme::px_4());

    for tool in TOOLS {
        container = container.child(tool_button(*tool));
    }

    container
}

/// A single tool button.
fn tool_button(tool: Tool) -> impl IntoElement {
    div()
        .w(px(36.0))
        .h(px(36.0))
        .rounded(px(4.0))
        .flex()
        .items_center()
        .justify_center()
        .text_color(theme::TEXT_MUTED)
        .text_size(px(16.0))
        .hover(|s| s.bg(theme::BG_HOVER).text_color(theme::TEXT_PRIMARY))
        .child(tool.icon().to_string())
}
