//! Timeline playhead — the vertical line indicating the current playback
//! position.
//!
//! The playhead is rendered as an overlay on top of all tracks. It is
//! positioned based on the current frame and zoom level.

use gpui::{IntoElement, ParentElement, Styled, div, px};

use crate::theme;

/// Builds the playhead overlay element.
///
/// `x` is the pixel position of the playhead relative to the timeline
/// content area.
pub fn build_playhead(x: f32) -> impl IntoElement {
    div()
        .absolute()
        .top_0()
        .left(px(x - 0.5))
        .w(px(1.0))
        .h_full()
        .bg(theme::PLAYHEAD)
        .child(
            div()
                .absolute()
                .top(px(-2.0))
                .left(px(-5.0))
                .w(px(10.0))
                .h(px(10.0))
                .bg(theme::PLAYHEAD_HANDLE)
                .rounded(px(2.0)),
        )
}
