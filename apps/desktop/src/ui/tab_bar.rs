//! Vertical tab bar — the 72px-wide icon rail on the far left.
//!
//! Mirrors the web app's `TabBar` (`assets/tabbar.tsx`): a column of
//! icon+label buttons that switch the assets panel's active view, plus
//! a storage card at the bottom. Each tab is a rounded-lg button with
//! an icon glyph and a tiny label underneath.

use gpui::{
    App, ClickEvent, Entity, InteractiveElement, IntoElement, ParentElement, SharedString,
    StatefulInteractiveElement, Styled, Window, div, px,
};

use crate::app::ArtidorApp;
use crate::state::editor_state::AssetsTab;
use crate::theme;

/// Width of the tab bar — matches web `w-[4.5rem]` (72px).
const TAB_BAR_WIDTH: gpui::Pixels = px(72.0);

/// Builds the vertical tab bar element.
pub fn build_tab_bar(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    let active = app.state.panels.active_tab;

    let mut bar = div()
        .w(TAB_BAR_WIDTH)
        .h_full()
        .flex_shrink_0()
        .rounded(px(12.0))
        .border_1()
        .border_color(theme::BORDER)
        .bg(theme::BG_PANEL)
        .flex()
        .flex_col()
        .overflow_hidden();

    // Tab list — fills available vertical space.
    let mut tabs = div()
        .flex_1()
        .min_h_0()
        .flex()
        .flex_col()
        .px(px(6.0))
        .py(px(8.0))
        .gap(px(2.0));

    for &tab in AssetsTab::ALL {
        tabs = tabs.child(tab_button(tab, active, entity.clone()));
    }

    bar = bar.child(tabs);

    // Storage card at the bottom (matches web `StorageCard`).
    bar = bar.child(storage_card());

    bar
}

/// A single tab button.
fn tab_button(
    tab: AssetsTab,
    active: AssetsTab,
    entity: Entity<ArtidorApp>,
) -> impl IntoElement {
    let is_active = tab == active;
    let label: SharedString = tab.label().to_string().into();
    let glyph: SharedString = tab.glyph().to_string().into();
    let btn_id: SharedString = format!("tab-{:?}", tab).into();

    let base = div()
        .w_full()
        .min_h(px(31.0))
        .flex()
        .flex_col()
        .items_center()
        .justify_center()
        .gap(px(2.0))
        .py(px(4.0))
        .rounded(px(8.0))
        .border_1()
        .text_size(px(9.0))
        .id(btn_id)
        .on_click(move |_: &ClickEvent, _window: &mut Window, cx: &mut App| {
            entity.update(cx, |app, cx| {
                app.state.panels.active_tab = tab;
                cx.notify();
            });
        });

    if is_active {
        base.border_color(gpui::Hsla {
            h: 0.0,
            s: 0.0,
            l: 1.0,
            a: 0.12,
        })
        .bg(gpui::Hsla {
            h: 0.0,
            s: 0.0,
            l: 1.0,
            a: 0.14,
        })
        .text_color(theme::TEXT_PRIMARY)
        .child(
            div()
                .text_size(px(16.0))
                .child(glyph),
        )
        .child(
            div()
                .text_size(px(8.0))
                .child(label),
        )
    } else {
        base.border_color(gpui::transparent_black())
            .text_color(gpui::Hsla {
                h: 0.0,
                s: 0.0,
                l: 1.0,
                a: 0.55,
            })
            .hover(|s| {
                s.bg(gpui::Hsla {
                    h: 0.0,
                    s: 0.0,
                    l: 1.0,
                    a: 0.06,
                })
                .text_color(theme::TEXT_PRIMARY)
            })
            .child(
                div()
                    .text_size(px(16.0))
                    .child(glyph),
            )
            .child(
                div()
                    .text_size(px(8.0))
                    .child(label),
            )
    }
}

/// The storage indicator card at the bottom of the tab bar.
fn storage_card() -> impl IntoElement {
    div()
        .m(px(6.0))
        .mt(px(8.0))
        .rounded(px(12.0))
        .border_1()
        .border_color(theme::BORDER)
        .bg(gpui::Hsla {
            h: 0.667,
            s: 0.0,
            l: 0.07,
            a: 0.9,
        })
        .px(px(8.0))
        .py(px(8.0))
        .flex()
        .flex_col()
        .items_center()
        .child(
            div()
                .text_size(px(10.0))
                .font_weight(gpui::FontWeight::BOLD)
                .text_color(gpui::Hsla {
                    h: 0.0,
                    s: 0.0,
                    l: 1.0,
                    a: 0.9,
                })
                .child("Local"),
        )
        .child(
            div()
                .text_size(px(8.0))
                .text_color(gpui::Hsla {
                    h: 0.0,
                    s: 0.0,
                    l: 1.0,
                    a: 0.4,
                })
                .child("Storage"),
        )
        .child(
            div()
                .mt(px(6.0))
                .w_full()
                .h(px(4.0))
                .rounded(px(2.0))
                .bg(gpui::Hsla {
                    h: 0.0,
                    s: 0.0,
                    l: 1.0,
                    a: 0.07,
                })
                .child(
                    div()
                        .w(px(12.0))
                        .h_full()
                        .rounded(px(2.0))
                        .bg(gpui::Hsla {
                            h: 0.0,
                            s: 0.0,
                            l: 1.0,
                            a: 0.85,
                        }),
                ),
        )
}
