//! Timeline panel — tracks, ruler, playhead, and element clips.
//!
//! Mirrors the web app's `panels/timeline/`. The timeline is the most
//! complex panel: it renders a time ruler with frame markers, a playhead
//! line, and horizontal tracks containing element clips positioned by
//! their start frame and duration.
//!
//! Interaction: clicking on the ruler seeks the playhead, clicking on an
//! element selects it, and dragging elements moves them.

pub mod playhead;
pub mod ruler;
pub mod track;

use gpui::{
    App, ClickEvent, Entity, IntoElement, ParentElement, Styled, Window, div, prelude::*, px,
};

use crate::app::ArtidorApp;
use crate::theme;

/// Builds the timeline panel element.
pub fn build_timeline_panel(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    let project = &app.state.project;
    let playhead_frame = app.state.playhead_frame;
    let px_per_frame = app.state.px_per_frame;
    let total_frames = project.total_frames().max(1);
    let timeline_width = total_frames as f32 * px_per_frame;
    let track_count = project.tracks.len();
    let tracks_height = track_count as f32 * f32::from(theme::TRACK_HEIGHT);
    let content_height = tracks_height + f32::from(theme::RULER_HEIGHT);

    let mut container = div()
        .w_full()
        .h_full()
        .bg(theme::BG_PANEL)
        .flex()
        .flex_col()
        .overflow_hidden();

    // Timeline toolbar
    container = container.child(build_timeline_toolbar(app, entity.clone()));

    // Ruler + tracks area
    container = container.child(
        div()
            .flex_1()
            .min_h_0()
            .id("timeline-scroll")
            .overflow_scroll()
            .child(
                div()
                    .w(px(timeline_width.max(800.0)))
                    .h(px(content_height))
                    .flex()
                    .flex_col()
                    .child(ruler::build_ruler(
                        total_frames,
                        px_per_frame,
                        playhead_frame,
                        entity.clone(),
                    ))
                    .children(project.tracks.iter().enumerate().map(|(idx, track)| {
                        track::build_track(
                            track,
                            idx,
                            px_per_frame,
                            playhead_frame,
                            &app.state.selection,
                            entity.clone(),
                        )
                    })),
            ),
    );

    container
}

/// Builds the timeline toolbar — 3-column layout matching web `TimelineToolbar`:
/// left: "Tracks" label, center: zoom controls, right: snap/split actions.
fn build_timeline_toolbar(app: &ArtidorApp, entity: Entity<ArtidorApp>) -> impl IntoElement {
    let zoom_text = format!("{:.1}px/f", app.state.px_per_frame);

    div()
        .h(theme::TIMELINE_TOOLBAR_HEIGHT)
        .w_full()
        .flex()
        .flex_row()
        .items_center()
        .px(px(14.0))
        .py(px(2.0))
        .border_b_1()
        .border_color(theme::BORDER)
        // Left: "Tracks" label
        .child(
            div()
                .flex_1()
                .flex()
                .flex_row()
                .items_center()
                .gap(px(8.0))
                .child(
                    div()
                        .text_size(px(10.0))
                        .font_weight(gpui::FontWeight::SEMIBOLD)
                        .text_color(gpui::Hsla {
                            h: 0.0,
                            s: 0.0,
                            l: 1.0,
                            a: 0.35,
                        })
                        .child("TRACKS"),
                )
                .child(
                    div()
                        .text_size(px(10.0))
                        .text_color(theme::TEXT_MUTED)
                        .child(zoom_text),
                ),
        )
        // Center: zoom controls
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap(px(2.0))
                .child(zoom_button("-", entity.clone(), ZoomAction::Out))
                .child(zoom_button("+", entity.clone(), ZoomAction::In))
                .child(zoom_button("Fit", entity.clone(), ZoomAction::Fit)),
        )
        // Right: split + delete actions
        .child(
            div()
                .flex_1()
                .flex()
                .flex_row()
                .items_center()
                .justify_end()
                .gap(px(4.0))
                .child(toolbar_action_button(
                    "✂",
                    "tl-split",
                    entity.clone(),
                    ToolbarEditAction::Split,
                ))
                .child(toolbar_action_button(
                    "⌫",
                    "tl-delete",
                    entity,
                    ToolbarEditAction::Delete,
                )),
        )
}

/// Which zoom action to perform.
enum ZoomAction {
    In,
    Out,
    Fit,
}

/// Which edit action the toolbar button triggers.
#[derive(Debug)]
enum ToolbarEditAction {
    Split,
    Delete,
}

/// A zoom toolbar button that directly updates the entity state.
fn zoom_button(label: &str, entity: Entity<ArtidorApp>, action: ZoomAction) -> impl IntoElement {
    let btn_id: gpui::SharedString = label.to_string().into();
    div()
        .px(theme::px_8())
        .py(theme::px_4())
        .rounded(px(3.0))
        .text_color(theme::TEXT_SECONDARY)
        .text_size(px(12.0))
        .hover(|s| s.bg(theme::BG_HOVER).text_color(theme::TEXT_PRIMARY))
        .child(label.to_string())
        .id(btn_id)
        .on_click(move |_: &ClickEvent, _window: &mut Window, cx: &mut App| {
            entity.update(cx, |app, cx| match action {
                ZoomAction::In => app.handle_zoom_in(cx),
                ZoomAction::Out => app.handle_zoom_out(cx),
                ZoomAction::Fit => app.handle_zoom_to_fit(cx),
            });
        })
}

/// A toolbar edit action button (split, delete, etc.).
fn toolbar_action_button(
    icon: &str,
    id: &str,
    entity: Entity<ArtidorApp>,
    action: ToolbarEditAction,
) -> impl IntoElement {
    let btn_id: gpui::SharedString = id.to_string().into();
    div()
        .w(px(28.0))
        .h(px(28.0))
        .rounded(px(6.0))
        .flex()
        .items_center()
        .justify_center()
        .text_color(theme::TEXT_SECONDARY)
        .text_size(px(13.0))
        .hover(|s| s.bg(theme::BG_HOVER).text_color(theme::TEXT_PRIMARY))
        .child(icon.to_string())
        .id(btn_id)
        .on_click(move |_: &ClickEvent, _window: &mut Window, cx: &mut App| {
            entity.update(cx, |app, cx| match action {
                ToolbarEditAction::Split => app.handle_split(cx),
                ToolbarEditAction::Delete => app.handle_delete(cx),
            });
        })
}
