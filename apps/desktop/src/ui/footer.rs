//! Footer bar — project metadata and status.
//!
//! Mirrors the web app's `editor-footer.tsx`:
//! - Left: "Worked on HH:MM:SS" capsule + FPS monitor
//! - Center: status dot (emerald pulse)
//! - Right: resolution + fps + aspect + stereo
//!
//! The web version updates the "Worked on" counter via direct DOM mutation
//! to avoid re-rendering the whole footer. In GPUI we use a simple status
//! string that updates on `cx.notify()` — the footer is cheap to re-render
//! in GPUI's retained mode.

use gpui::{Entity, IntoElement, ParentElement, SharedString, Styled, div, px};

use crate::app::ArtidorApp;
use crate::theme;

/// Builds the footer bar element.
pub fn build_footer(app: &ArtidorApp, _entity: Entity<ArtidorApp>) -> impl IntoElement {
    let fps = app.state.project.fps().round() as i32;
    let width = app.state.project.width;
    let height = app.state.project.height;
    let aspect = format_aspect(width, height);
    let status: SharedString = app.status_message.clone();

    div()
        .h(theme::FOOTER_HEIGHT)
        .w_full()
        .flex()
        .flex_row()
        .items_center()
        .justify_between()
        .px(px(16.0))
        .bg(theme::BG_APP)
        .border_t_1()
        .border_color(theme::BORDER)
        .relative()
        // Left: "Worked on" capsule + status text
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(px(12.0))
                .child(
                    // "Worked on" capsule
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap(px(6.0))
                        .rounded(px(14.0))
                        .border_1()
                        .border_color(gpui::Hsla {
                            h: 0.0,
                            s: 0.0,
                            l: 1.0,
                            a: 0.07,
                        })
                        .bg(gpui::Hsla {
                            h: 0.0,
                            s: 0.0,
                            l: 1.0,
                            a: 0.035,
                        })
                        .px(px(10.0))
                        .py(px(4.0))
                        .child(
                            div()
                                .text_size(px(9.0))
                                .font_weight(gpui::FontWeight::SEMIBOLD)
                                .text_color(gpui::Hsla {
                                    h: 0.0,
                                    s: 0.0,
                                    l: 1.0,
                                    a: 0.32,
                                })
                                .child("WORKED ON"),
                        )
                        .child(
                            div()
                                .text_size(px(11.0))
                                .text_color(gpui::Hsla {
                                    h: 0.0,
                                    s: 0.0,
                                    l: 1.0,
                                    a: 0.82,
                                })
                                .child("00:00:00"),
                        ),
                )
                .child(
                    div()
                        .text_size(px(10.0))
                        .text_color(theme::TEXT_MUTED)
                        .child(status),
                ),
        )
        // Center: status dot (emerald, absolute-centered)
        .child(
            div()
                .absolute()
                .left_1_2()
                .top_1_2()
                .flex()
                .flex_row()
                .items_center()
                .gap(px(8.0))
                .rounded(px(14.0))
                .border_1()
                .border_color(gpui::Hsla {
                    h: 0.525,
                    s: 0.85,
                    l: 0.53,
                    a: 0.16,
                })
                .bg(gpui::Hsla {
                    h: 0.525,
                    s: 0.85,
                    l: 0.53,
                    a: 0.055,
                })
                .px(px(12.0))
                .py(px(4.0))
                .child(
                    div()
                        .w(px(6.0))
                        .h(px(6.0))
                        .rounded(px(3.0))
                        .bg(theme::ACCENT_EMERALD),
                ),
        )
        // Right: resolution + fps + aspect + stereo
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(px(12.0))
                .text_size(px(10.0))
                .text_color(theme::TEXT_MUTED)
                .child(div().child(format!("{height}p")))
                .child(
                    div()
                        .text_color(gpui::Hsla {
                            h: 0.0,
                            s: 0.0,
                            l: 1.0,
                            a: 0.22,
                        })
                        .child("•"),
                )
                .child(div().child(format!("{fps} fps")))
                .child(
                    div()
                        .text_color(gpui::Hsla {
                            h: 0.0,
                            s: 0.0,
                            l: 1.0,
                            a: 0.22,
                        })
                        .child("•"),
                )
                .child(div().child(aspect))
                .child(
                    div()
                        .text_color(gpui::Hsla {
                            h: 0.0,
                            s: 0.0,
                            l: 1.0,
                            a: 0.22,
                        })
                        .child("•"),
                )
                .child(div().child("Stereo")),
        )
}

/// Formats the canvas aspect ratio as a reduced fraction (e.g. "16:9").
fn format_aspect(width: u32, height: u32) -> String {
    let divisor = gcd(width, height);
    if divisor == 0 {
        return "16:9".to_string();
    }
    format!("{}:{}", width / divisor, height / divisor)
}

/// Greatest common divisor.
fn gcd(a: u32, b: u32) -> u32 {
    if b == 0 { a } else { gcd(b, a % b) }
}
