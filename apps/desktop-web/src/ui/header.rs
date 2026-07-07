//! Header bar — project name, zoom, and action buttons.
//!
//! Mirrors the web app's `editor-header.tsx`:
//! - Left: logo + project name capsule
//! - Center: zoom capsule (absolute-centered)
//! - Right: cloud status + settings + share + export + window controls
//!
//! Desktop-specific: window controls (minimize —, maximize □, close ✕)
//! are appended after the Export button, matching the user's request for
//! "button x kotak dan - di samping export".

#![allow(dead_code)]

use gpui::{
    App, ClickEvent, Entity, InteractiveElement, IntoElement, ParentElement, SharedString,
    StatefulInteractiveElement, Styled, Window, div, px,
};

use crate::app::ArtidorApp;
use crate::theme;

/// Builds the header bar element.
///
/// Layout (matches web `EditorHeader`):
/// ```text
/// [Logo] [Projects / ProjectName]  …  [Fit ▾]  …  [Cloud] [⚙] [Share] [Export] [— □ ✕]
/// ```
pub fn build_header(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    let project_name: SharedString = app.state.project.name.clone().into();
    let dirty_dot: SharedString = if app.state.dirty {
        "●".into()
    } else {
        "".into()
    };

    div()
        .h(theme::HEADER_HEIGHT)
        .w_full()
        .flex()
        .flex_row()
        .items_center()
        .px(px(16.0))
        .bg(theme::BG_APP)
        .relative()
        // Left: logo + project name capsule
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(px(12.0))
                .child(
                    // Logo
                    div()
                        .text_color(theme::TEXT_ACCENT)
                        .text_size(px(16.0))
                        .font_weight(gpui::FontWeight::BOLD)
                        .child("Artidor"),
                )
                // Identity pod capsule (matches web's capsule style)
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap(px(8.0))
                        .h(px(28.0))
                        .rounded(px(14.0))
                        .border_1()
                        .border_color(theme::CAPSULE_BORDER)
                        .bg(theme::CAPSULE_BG)
                        .px(px(10.0))
                        .child(
                            div()
                                .text_color(theme::TEXT_FAINT)
                                .text_size(px(10.0))
                                .child("Projects"),
                        )
                        .child(
                            div()
                                .text_color(gpui::Hsla {
                                    h: 0.0,
                                    s: 0.0,
                                    l: 1.0,
                                    a: 0.2,
                                })
                                .child("/"),
                        )
                        .child(
                            div()
                                .text_color(theme::TEXT_SECONDARY)
                                .text_size(px(12.0))
                                .child(project_name),
                        )
                        .child(
                            div()
                                .text_color(theme::WARNING)
                                .text_size(px(10.0))
                                .child(dirty_dot),
                        ),
                ),
        )
        // Center: zoom capsule (absolute-centered, matches web)
        .child(
            div()
                .absolute()
                .left_1_2()
                .top_1_2()
                .flex()
                .flex_row()
                .items_center()
                .gap(px(6.0))
                .h(px(28.0))
                .rounded(px(14.0))
                .border_1()
                .border_color(theme::CAPSULE_BORDER)
                .bg(theme::CAPSULE_BG)
                .px(px(8.0))
                .child(
                    div()
                        .text_color(theme::TEXT_SECONDARY)
                        .text_size(px(11.0))
                        .child("Fit"),
                )
                .child(
                    div()
                        .text_color(theme::TEXT_FAINT)
                        .text_size(px(10.0))
                        .child("▾"),
                ),
        )
        // Right: action buttons + window controls
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(px(10.0))
                .ml_auto()
                // Settings button
                .child(header_icon_button(
                    "⚙",
                    "header-settings",
                    entity.clone(),
                    HeaderAction::None,
                ))
                // Share button
                .child(header_text_button(
                    "Share",
                    "header-share",
                    entity.clone(),
                    HeaderAction::None,
                ))
                // Export button (emphasized)
                .child(header_export_button("header-export", entity.clone()))
                // Window controls: minimize, maximize, close
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap(px(2.0))
                        .ml(px(8.0))
                        .child(window_button("—", "win-minimize", WindowAction::Minimize))
                        .child(window_button("□", "win-maximize", WindowAction::Maximize))
                        .child(window_button("✕", "win-close", WindowAction::Close)),
                ),
        )
}

/// Which header action to perform.
enum HeaderAction {
    Import,
    Save,
    Export,
    None,
}

/// Which window control action to perform.
enum WindowAction {
    Minimize,
    Maximize,
    Close,
}

/// A small icon-only header button (settings, etc.).
fn header_icon_button(
    icon: &str,
    id: &str,
    _entity: Entity<ArtidorApp>,
    _action: HeaderAction,
) -> impl IntoElement {
    let btn_id: SharedString = id.to_string().into();
    div()
        .w(px(28.0))
        .h(px(28.0))
        .rounded(px(8.0))
        .flex()
        .items_center()
        .justify_center()
        .text_color(theme::TEXT_SECONDARY)
        .text_size(px(14.0))
        .hover(|s| s.bg(theme::BG_HOVER).text_color(theme::TEXT_PRIMARY))
        .child(icon.to_string())
        .id(btn_id)
        .on_click(move |_: &ClickEvent, _window: &mut Window, _cx: &mut App| {
            // Settings/share dialogs not yet wired — placeholder.
        })
}

/// A text header button (Share, etc.).
fn header_text_button(
    label: &str,
    id: &str,
    _entity: Entity<ArtidorApp>,
    _action: HeaderAction,
) -> impl IntoElement {
    let btn_id: SharedString = id.to_string().into();
    div()
        .h(px(28.0))
        .rounded(px(8.0))
        .flex()
        .items_center()
        .px(px(12.0))
        .text_color(theme::TEXT_SECONDARY)
        .text_size(px(12.0))
        .hover(|s| s.bg(theme::BG_HOVER).text_color(theme::TEXT_PRIMARY))
        .child(label.to_string())
        .id(btn_id)
        .on_click(move |_: &ClickEvent, _window: &mut Window, _cx: &mut App| {
            // Share dialog not yet wired — placeholder.
        })
}

/// The Export button — emphasized with a subtle background.
fn header_export_button(id: &str, entity: Entity<ArtidorApp>) -> impl IntoElement {
    let btn_id: SharedString = id.to_string().into();
    div()
        .h(px(28.0))
        .rounded(px(8.0))
        .flex()
        .items_center()
        .px(px(14.0))
        .bg(gpui::Hsla {
            h: 0.0,
            s: 0.0,
            l: 1.0,
            a: 0.08,
        })
        .border_1()
        .border_color(theme::CAPSULE_BORDER)
        .text_color(theme::TEXT_PRIMARY)
        .text_size(px(12.0))
        .font_weight(gpui::FontWeight::MEDIUM)
        .hover(|s| {
            s.bg(gpui::Hsla {
                h: 0.0,
                s: 0.0,
                l: 1.0,
                a: 0.12,
            })
        })
        .child("Export")
        .id(btn_id)
        .on_click(move |_: &ClickEvent, _window: &mut Window, cx: &mut App| {
            entity.update(cx, |app, cx| app.handle_export(cx));
        })
}

/// A window control button (minimize, maximize, close).
///
/// The close button turns red on hover (standard Windows convention).
fn window_button(icon: &str, id: &str, action: WindowAction) -> impl IntoElement {
    let btn_id: SharedString = id.to_string().into();
    let is_close = matches!(action, WindowAction::Close);

    let base = div()
        .w(px(32.0))
        .h(px(28.0))
        .flex()
        .items_center()
        .justify_center()
        .text_color(theme::TEXT_SECONDARY)
        .text_size(px(12.0))
        .id(btn_id)
        .on_click(move |_: &ClickEvent, _window: &mut Window, cx: &mut App| {
            match action {
                WindowAction::Close => cx.quit(),
                WindowAction::Minimize | WindowAction::Maximize => {
                    // GPUI 0.2.2 does not expose minimize/maximize APIs
                    // directly. These will be wired when the platform
                    // abstraction is extended.
                }
            }
        });

    if is_close {
        base.hover(|s| {
            s.bg(gpui::Hsla {
                h: 0.0,
                s: 0.85,
                l: 0.45,
                a: 1.0,
            })
            .text_color(gpui::Hsla {
                h: 0.0,
                s: 0.0,
                l: 1.0,
                a: 1.0,
            })
        })
        .child(icon.to_string())
    } else {
        base.hover(|s| s.bg(theme::BG_HOVER).text_color(theme::TEXT_PRIMARY))
            .child(icon.to_string())
    }
}
