//! Footer bar — playback controls, timecode display, and status message.
//!
//! Mirrors the web app's `editor-footer.tsx`. Contains transport controls
//! (play/pause, stop, step), the current timecode, zoom level, and a
//! status message area.

use gpui::{
    App, ClickEvent, Entity, IntoElement, ParentElement, SharedString, Styled, Window, div,
    prelude::*, px,
};

use crate::app::ArtidorApp;
use crate::theme;

/// Builds the footer bar element.
pub fn build_footer(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    let frame = app.state.playhead_frame;
    let fps = app.state.project.fps();
    let seconds = frame as f64 / fps;
    let timecode: SharedString = format!("{frame:06} | {seconds:.2}s").into();
    let total_frames = app.state.project.total_frames();
    let total_text: SharedString = format!("/ {total_frames}").into();
    let status: SharedString = app.status_message.clone();
    let playing = app.state.playing;
    let looping = app.state.looping;
    let zoom_text: SharedString = format!("{:.1}px/f", app.state.px_per_frame).into();

    div()
        .h(theme::FOOTER_HEIGHT)
        .w_full()
        .bg(theme::BG_PANEL)
        .border_t_1()
        .border_color(theme::BORDER)
        .flex()
        .flex_row()
        .items_center()
        .px(theme::px_12())
        .gap(theme::px_8())
        // Left: transport controls
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(theme::px_4())
                .child(transport_button(
                    "<<",
                    FooterAction::JumpToStart,
                    entity.clone(),
                ))
                .child(transport_button(
                    "<",
                    FooterAction::StepBackward,
                    entity.clone(),
                ))
                .child(transport_button(
                    if playing { "||" } else { ">" },
                    FooterAction::PlayPause,
                    entity.clone(),
                ))
                .child(transport_button(
                    ">",
                    FooterAction::StepForward,
                    entity.clone(),
                ))
                .child(transport_button(
                    ">>",
                    FooterAction::JumpToEnd,
                    entity.clone(),
                ))
                .child(transport_button(
                    if looping { "Loop*" } else { "Loop" },
                    FooterAction::ToggleLoop,
                    entity.clone(),
                )),
        )
        // Center: timecode
        .child(
            div()
                .flex_1()
                .flex()
                .justify_center()
                .items_center()
                .gap(theme::px_8())
                .child(
                    div()
                        .text_color(theme::TEXT_PRIMARY)
                        .text_size(px(13.0))
                        .font_weight(gpui::FontWeight::BOLD)
                        .child(timecode),
                )
                .child(
                    div()
                        .text_color(theme::TEXT_MUTED)
                        .text_size(px(11.0))
                        .child(total_text),
                ),
        )
        // Right: zoom + status
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(theme::px_12())
                .child(
                    div()
                        .text_color(theme::TEXT_MUTED)
                        .text_size(px(11.0))
                        .child(zoom_text),
                )
                .child(div().w(px(1.0)).h(px(16.0)).bg(theme::BORDER))
                .child(
                    div()
                        .text_color(theme::TEXT_SECONDARY)
                        .text_size(px(11.0))
                        .child(status),
                ),
        )
}

/// Which footer transport action to perform.
enum FooterAction {
    PlayPause,
    JumpToStart,
    JumpToEnd,
    StepForward,
    StepBackward,
    ToggleLoop,
}

/// A transport control button.
fn transport_button(
    icon: &str,
    action: FooterAction,
    entity: Entity<ArtidorApp>,
) -> impl IntoElement {
    let btn_id: gpui::SharedString = icon.to_string().into();
    div()
        .px(theme::px_8())
        .py(theme::px_4())
        .rounded(px(3.0))
        .text_color(theme::TEXT_SECONDARY)
        .text_size(px(14.0))
        .hover(|s| s.bg(theme::BG_HOVER).text_color(theme::TEXT_PRIMARY))
        .child(icon.to_string())
        .id(btn_id)
        .on_click(move |_: &ClickEvent, _window: &mut Window, cx: &mut App| {
            entity.update(cx, |app, cx| match action {
                FooterAction::PlayPause => app.handle_play_pause(cx),
                FooterAction::JumpToStart => app.handle_jump_to_start(cx),
                FooterAction::JumpToEnd => app.handle_jump_to_end(cx),
                FooterAction::StepForward => app.handle_step_forward(cx),
                FooterAction::StepBackward => app.handle_step_backward(cx),
                FooterAction::ToggleLoop => app.handle_toggle_loop(cx),
            });
        })
}
