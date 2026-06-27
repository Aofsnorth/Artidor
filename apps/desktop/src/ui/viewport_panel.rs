//! Viewport panel — the center canvas area that displays the WGPU-composited
//! frame.
//!
//! This is the desktop equivalent of the web app's `preview-viewport.tsx`.
//! It displays the cached `RenderImage` from the compositor, centered with
//! letterboxing. When no image is available (GPU initializing or no media
//! loaded), it shows a placeholder.

use gpui::{div, img, px, Entity, ImageSource, IntoElement, ParentElement, Styled, prelude::*};

use crate::app::ArtidorApp;
use crate::render::viewport::ViewportState;
use crate::theme;
use std::sync::Arc;

/// Builds the viewport panel element.
pub fn build_viewport_panel(
    app: &ArtidorApp,
    _entity: Entity<ArtidorApp>,
    cached_image: Option<Arc<gpui::RenderImage>>,
) -> impl IntoElement {
    let bg = theme::BG_VIEWPORT;

    let mut panel = div()
        .flex_1()
        .h_full()
        .bg(bg)
        .flex()
        .justify_center()
        .items_center()
        .overflow_hidden()
        .relative();

    // Show the composited image, or a placeholder.
    match &app.viewport {
        ViewportState::Initializing => {
            panel = panel.child(
                div()
                    .text_color(theme::TEXT_MUTED)
                    .text_size(px(14.0))
                    .child("Initializing GPU…"),
            );
        }
        ViewportState::Failed(err) => {
            panel = panel.child(
                div()
                    .flex()
                    .flex_col()
                    .items_center()
                    .gap(theme::px_8())
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
                // Display the composited frame, fit to viewport.
                panel = panel.child(
                    img(ImageSource::Render(image))
                        .max_w_full()
                        .max_h_full()
                        .object_fit(gpui::ObjectFit::Contain),
                );
            } else {
                // No media loaded — show empty canvas placeholder.
                let w = app.state.project.width;
                let h = app.state.project.height;
                panel = panel.child(
                    div()
                        .flex()
                        .flex_col()
                        .items_center()
                        .gap(theme::px_8())
                        .child(
                            div()
                                .w(px(240.0))
                                .h(px(135.0))
                                .rounded(px(4.0))
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

    panel
}
