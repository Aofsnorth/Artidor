//! Viewport panel — the center canvas area that displays the WGPU-composited
//! frame, plus the preview toolbar below it.
//!
//! Mirrors the web app's `PreviewPanel` (`preview/index.tsx` + `toolbar.tsx`):
//! - Top: viewport canvas (flex-1, centered, letterboxed)
//! - Bottom: preview toolbar (44px) with timecode (left), transport controls
//!   (center), loop + fullscreen (right)

use gpui::{
    App, ClickEvent, Entity, ImageSource, InteractiveElement, IntoElement, ParentElement,
    StatefulInteractiveElement, Styled, Window, div, img, px,
};

use crate::app::ArtidorApp;
use crate::render::viewport::ViewportState;
use crate::theme;

use std::sync::Arc;

/// Builds the viewport panel element (viewport + toolbar).
pub fn build_viewport_panel(
    app: &ArtidorApp,
    entity: Entity<ArtidorApp>,
    cached_image: Option<Arc<gpui::RenderImage>>,
) -> impl IntoElement {
    div()
        .flex_1()
        .h_full()
        .flex()
        .flex_col()
        .min_w_0()
        .min_h_0()
        // Viewport canvas area (flex-1)
        .child(build_viewport_canvas(app, &cached_image))
        // Preview toolbar (44px)
        .child(build_preview_toolbar(app, entity))
}

/// Builds the viewport canvas area — the WGPU-composited frame, centered.
fn build_viewport_canvas(
    app: &ArtidorApp,
    cached_image: &Option<Arc<gpui::RenderImage>>,
) -> impl IntoElement {
    let mut canvas = div()
        .flex_1()
        .min_h_0()
        .flex()
        .items_center()
        .justify_center()
        .overflow_hidden()
        .bg(gpui::Hsla {
            h: 0.667,
            s: 0.0,
            l: 0.03,
            a: 1.0,
        })
        .px(px(4.0))
        .pt(px(6.0));

    match &app.viewport {
        ViewportState::Initializing => {
            canvas = canvas.child(
                div()
                    .text_color(theme::TEXT_MUTED)
                    .text_size(px(14.0))
                    .child("Initializing GPU…"),
            );
        }
        ViewportState::Failed(err) => {
            canvas = canvas.child(
                div()
                    .flex()
                    .flex_col()
                    .items_center()
                    .gap(px(8.0))
                    .child(
                        div()
                            .text_color(theme::DANGER)
                            .text_size(px(14.0))
                            .child("GPU initialization failed"),
                    )
                    .child(
                        div()
                            .text_color(theme::TEXT_MUTED)
                            .text_size(px(11.0))
                            .child(err.clone()),
                    ),
            );
        }
        ViewportState::Ready(_) => {
            if let Some(image) = cached_image {
                canvas = canvas.child(
                    img(ImageSource::Render(image.clone()))
                        .max_w_full()
                        .max_h_full()
                        .rounded(px(6.0))
                        .border_1()
                        .border_color(theme::BORDER),
                );
            } else {
                let w = app.state.project.width;
                let h = app.state.project.height;
                canvas = canvas.child(
                    div()
                        .flex()
                        .flex_col()
                        .items_center()
                        .gap(px(8.0))
                        .child(
                            div()
                                .w(px(240.0))
                                .h(px(135.0))
                                .rounded(px(6.0))
                                .border_1()
                                .border_color(theme::BORDER)
                                .bg(theme::BG_APP)
                                .flex()
                                .items_center()
                                .justify_center()
                                .child(
                                    div()
                                        .text_color(theme::TEXT_MUTED)
                                        .text_size(px(11.0))
                                        .child(format!("{w}×{h}")),
                                ),
                        )
                        .child(
                            div()
                                .text_color(theme::TEXT_MUTED)
                                .text_size(px(12.0))
                                .child("Import media to begin"),
                        ),
                );
            }
        }
    }

    canvas
}

/// Preview toolbar actions.
#[derive(Debug)]
enum ToolbarAction {
    JumpToStart,
    StepBackward,
    PlayPause,
    StepForward,
    JumpToEnd,
    ToggleLoop,
    ToggleFullscreen,
}

/// Builds the preview toolbar (44px) — timecode (left), transport (center),
/// loop + fullscreen (right).
fn build_preview_toolbar(
    app: &ArtidorApp,
    entity: Entity<ArtidorApp>,
) -> impl IntoElement {
    let frame = app.state.playhead_frame;
    let fps = app.state.project.fps();
    let total_frames = app.state.project.total_frames();
    let timecode: gpui::SharedString = format_timecode(frame, fps).into();
    let total_tc: gpui::SharedString = format_timecode(total_frames, fps).into();
    let playing = app.state.playing;
    let looping = app.state.looping;

    div()
        .h(theme::PREVIEW_TOOLBAR_HEIGHT)
        .w_full()
        .flex()
        .flex_row()
        .items_center()
        .justify_between()
        .px(px(12.0))
        .border_t_1()
        .border_color(theme::BORDER)
        // Left: timecode display
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(px(8.0))
                .child(
                    div()
                        .text_color(theme::TEXT_PRIMARY)
                        .text_size(px(12.0))
                        .child(timecode),
                )
                .child(
                    div()
                        .text_color(theme::TEXT_MUTED)
                        .text_size(px(11.0))
                        .child("/"),
                )
                .child(
                    div()
                        .text_color(theme::TEXT_MUTED)
                        .text_size(px(11.0))
                        .child(total_tc),
                ),
        )
        // Center: transport controls
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(px(4.0))
                .child(transport_button("⏮", ToolbarAction::JumpToStart, entity.clone()))
                .child(transport_button("◀", ToolbarAction::StepBackward, entity.clone()))
                .child(transport_button(
                    if playing { "⏸" } else { "▶" },
                    ToolbarAction::PlayPause,
                    entity.clone(),
                ))
                .child(transport_button("▶", ToolbarAction::StepForward, entity.clone()))
                .child(transport_button("⏭", ToolbarAction::JumpToEnd, entity.clone())),
        )
        // Right: loop + fullscreen
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(px(4.0))
                .child(transport_button(
                    if looping { "🔁*" } else { "🔁" },
                    ToolbarAction::ToggleLoop,
                    entity.clone(),
                ))
                .child(transport_button(
                    "⛶",
                    ToolbarAction::ToggleFullscreen,
                    entity,
                )),
        )
}

/// A transport control button.
fn transport_button(
    icon: &str,
    action: ToolbarAction,
    entity: Entity<ArtidorApp>,
) -> impl IntoElement {
    let btn_id: gpui::SharedString = format!("transport-{:?}", action).into();
    div()
        .w(px(28.0))
        .h(px(28.0))
        .rounded(px(6.0))
        .flex()
        .items_center()
        .justify_center()
        .text_color(theme::TEXT_SECONDARY)
        .text_size(px(14.0))
        .hover(|s| s.bg(theme::BG_HOVER).text_color(theme::TEXT_PRIMARY))
        .child(icon.to_string())
        .id(btn_id)
        .on_click(move |_: &ClickEvent, _window: &mut Window, cx: &mut App| {
            entity.update(cx, |app, cx| match action {
                ToolbarAction::PlayPause => app.handle_play_pause(cx),
                ToolbarAction::JumpToStart => app.handle_jump_to_start(cx),
                ToolbarAction::JumpToEnd => app.handle_jump_to_end(cx),
                ToolbarAction::StepForward => app.handle_step_forward(cx),
                ToolbarAction::StepBackward => app.handle_step_backward(cx),
                ToolbarAction::ToggleLoop => app.handle_toggle_loop(cx),
                ToolbarAction::ToggleFullscreen => app.handle_toggle_fullscreen(cx),
            });
        })
}

/// Formats a frame number as HH:MM:SS:FF timecode.
fn format_timecode(frame: i64, fps: f64) -> String {
    let fps_int = fps.round() as i64;
    if fps_int == 0 {
        return "00:00:00:00".to_string();
    }
    let total_seconds = frame / fps_int;
    let frames = frame % fps_int;
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;
    format!(
        "{:02}:{:02}:{:02}:{:02}",
        hours, minutes, seconds, frames
    )
}
