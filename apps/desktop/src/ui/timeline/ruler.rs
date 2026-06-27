//! Timeline ruler — frame markers and playhead scrubbing.
//!
//! Renders a horizontal ruler with frame/time markers. Clicking on the
//! ruler seeks the playhead to that frame.

use gpui::{
    App, Entity, InteractiveElement, IntoElement, MouseButton, MouseDownEvent, ParentElement,
    Styled, Window, div, px,
};

use crate::app::ArtidorApp;
use crate::theme;

/// Builds the timeline ruler element.
pub fn build_ruler(
    total_frames: i64,
    px_per_frame: f32,
    playhead_frame: i64,
    entity: Entity<ArtidorApp>,
) -> impl IntoElement {
    let mut ruler = div()
        .w_full()
        .h(theme::RULER_HEIGHT)
        .bg(theme::BG_PANEL_RAISED)
        .border_b_1()
        .border_color(theme::BORDER)
        .relative()
        .id("timeline-ruler")
        .on_mouse_down(
            MouseButton::Left,
            move |event: &MouseDownEvent, _window: &mut Window, cx: &mut App| {
                let frame = (f32::from(event.position.x) / px_per_frame) as i64;
                entity.update(cx, |app, cx| {
                    app.state.seek_to(frame);
                    app.content_dirty = true;
                    cx.notify();
                });
            },
        );

    // Determine marker interval (show a label every N frames).
    let marker_interval = determine_marker_interval(px_per_frame);

    // Add frame markers.
    let mut markers = div().absolute().top_0().left_0().w_full().h_full();
    let mut frame = 0i64;
    while frame <= total_frames + marker_interval {
        let x = frame as f32 * px_per_frame;
        let is_major = frame % marker_interval == 0;

        let tick_height = if is_major { 12.0 } else { 6.0 };
        let tick_color = if is_major {
            theme::TEXT_MUTED
        } else {
            theme::BORDER
        };

        markers = markers.child(
            div()
                .absolute()
                .top_0()
                .left(px(x))
                .w(px(1.0))
                .h(px(tick_height))
                .bg(tick_color),
        );

        if is_major && frame > 0 {
            let seconds = frame as f64 / 30.0; // Approximate; real fps varies
            let label = if seconds >= 1.0 {
                format!("{seconds:.1}s")
            } else {
                format!("{frame}")
            };
            markers = markers.child(
                div()
                    .absolute()
                    .top(px(14.0))
                    .left(px(x + 3.0))
                    .text_color(theme::TEXT_MUTED)
                    .text_size(px(9.0))
                    .child(label),
            );
        }

        frame += marker_interval / 4;
        if frame == 0 {
            frame = 1;
        }
    }

    ruler = ruler.child(markers);

    // Playhead handle on the ruler.
    let playhead_x = playhead_frame as f32 * px_per_frame;
    ruler = ruler.child(
        div()
            .absolute()
            .top_0()
            .left(px(playhead_x - 5.0))
            .w(px(10.0))
            .h(theme::RULER_HEIGHT)
            .bg(theme::PLAYHEAD_HANDLE)
            .rounded_b(px(2.0)),
    );

    ruler
}

/// Determines the marker interval (in frames) based on zoom level.
fn determine_marker_interval(px_per_frame: f32) -> i64 {
    // We want roughly 80px between major markers.
    let target_px = 80.0;
    let frames_per_marker = (target_px / px_per_frame) as i64;

    // Round to a nice number: 1, 2, 5, 10, 15, 30, 60, 120, 300, 600
    for &nice in &[1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600] {
        if nice >= frames_per_marker {
            return nice;
        }
    }
    3600
}
