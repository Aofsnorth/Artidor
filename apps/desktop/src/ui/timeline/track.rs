//! Timeline track — renders a single track lane with its element clips.
//!
//! Each track is a horizontal strip. Elements are rendered as colored
//! rectangles positioned by their start frame and duration, scaled by
//! the current zoom level.

use gpui::{
    div, px, App, Entity, InteractiveElement, IntoElement, MouseButton, MouseDownEvent,
    ParentElement, Styled, Window, prelude::*,
};

use crate::app::ArtidorApp;
use crate::state::editor_state::Selection;
use crate::state::project::{Element, Track};
use crate::theme;

/// Builds a single track element.
pub fn build_track(
    track: &Track,
    track_idx: usize,
    px_per_frame: f32,
    _playhead_frame: i64,
    selection: &Selection,
    entity: Entity<ArtidorApp>,
) -> impl IntoElement {
    let track_color = theme::track_color(&track.element_type);
    let bg = if track_idx % 2 == 0 {
        theme::BG_TRACK
    } else {
        theme::BG_TRACK_ALT
    };

    let mut lane = div()
        .w_full()
        .h(theme::TRACK_HEIGHT)
        .bg(bg)
        .border_b_1()
        .border_color(theme::BORDER)
        .relative()
        .flex()
        .flex_row()
        .items_center();

    // Track label area (fixed width on the left).
    lane = lane.child(
        div()
            .w(px(120.0))
            .h_full()
            .bg(theme::BG_PANEL_RAISED)
            .border_r_1()
            .border_color(theme::BORDER)
            .flex()
            .items_center()
            .px(theme::px_8())
            .gap(theme::px_6())
            .child(div().w(px(8.0)).h(px(8.0)).rounded(px(2.0)).bg(track_color))
            .child(
                div()
                    .text_color(theme::TEXT_SECONDARY)
                    .text_size(px(11.0))
                    .child(track.name.clone()),
            )
            .when(track.muted, |d| {
                d.child(
                    div()
                        .text_color(theme::DANGER)
                        .text_size(px(10.0))
                        .child("M"),
                )
            })
            .when(track.locked, |d| {
                d.child(
                    div()
                        .text_color(theme::WARNING)
                        .text_size(px(10.0))
                        .child("L"),
                )
            }),
    );

    // Element clips area.
    let mut clips_area = div().flex_1().h_full().relative();

    for element in &track.elements {
        let is_selected = selection.element_ids.contains(&element.id);
        clips_area = clips_area.child(build_element_clip(
            element,
            px_per_frame,
            track_color,
            is_selected,
            entity.clone(),
        ));
    }

    lane = lane.child(clips_area);
    lane
}

/// Builds a single element clip on the timeline.
fn build_element_clip(
    element: &Element,
    px_per_frame: f32,
    track_color: gpui::Hsla,
    is_selected: bool,
    entity: Entity<ArtidorApp>,
) -> impl IntoElement {
    let x = element.start_frame as f32 * px_per_frame;
    let width = element.duration_frames as f32 * px_per_frame;
    let element_id = element.id.clone();

    let border_color = if is_selected {
        theme::BORDER_FOCUS
    } else {
        gpui::hsla(0.0, 0.0, 0.0, 0.3)
    };

    div()
        .absolute()
        .top(px(4.0))
        .left(px(x))
        .w(px(width.max(2.0)))
        .h(px(f32::from(theme::TRACK_HEIGHT) - 12.0))
        .rounded(px(3.0))
        .bg(track_color)
        .border_1()
        .border_color(border_color)
        .when(is_selected, |d| d.border_2().border_color(theme::BORDER_FOCUS))
        .px(theme::px_4())
        .flex()
        .items_center()
        .overflow_hidden()
        .child(
            div()
                .text_color(gpui::hsla(0.0, 0.0, 1.0, 0.9))
                .text_size(px(10.0))
                .child(element.name.clone()),
        )
        .on_mouse_down(
            MouseButton::Left,
            move |event: &MouseDownEvent, _window: &mut Window, cx: &mut App| {
                entity.update(cx, |app, cx| {
                    if event.modifiers.shift {
                        app.state.selection.toggle(&element_id);
                    } else {
                        app.state.selection =
                            crate::state::editor_state::Selection::single(&element_id);
                    }
                    cx.notify();
                });
            },
        )
}
