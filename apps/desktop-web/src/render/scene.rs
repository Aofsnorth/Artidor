//! Scene builder — converts the editor state at a given frame into a
//! `FrameDescriptor` that the compositor can render.
//!
//! This is the desktop equivalent of the web app's `scene-builder.ts`.
//! It resolves which elements are visible at the playhead, maps each
//! element to a `LayerDescriptor`, and attaches effect passes and masks.

use crate::state::editor_state::EditorState;
use crate::state::project::ElementType;
use compositor::{CanvasClearDescriptor, FrameDescriptor, FrameItemDescriptor, LayerDescriptor};

/// Builds a `FrameDescriptor` for the current playhead position.
///
/// Elements are rendered bottom-to-top (last track = top layer), matching
/// the web app's compositing order.
pub fn build_frame(state: &EditorState) -> FrameDescriptor {
    let project = &state.project;
    let frame = state.playhead_frame;

    let mut items: Vec<FrameItemDescriptor> = Vec::new();

    // Iterate tracks in reverse so the first track is the bottom layer.
    for track in project.tracks.iter().rev() {
        if track.muted {
            continue;
        }
        for element in &track.elements {
            if !element.contains_frame(frame) {
                continue;
            }

            // Only visual element types produce layers.
            if !is_visual(element.element_type) {
                continue;
            }

            // Text and graphic elements without a source texture are skipped
            // for now — they'd need a rasterization step (future work).
            let texture_id = match &element.source_path {
                Some(path) => {
                    // Find the registered texture ID for this path.
                    match state.find_media_by_path(std::path::Path::new(path)) {
                        Some(id) => id.to_string(),
                        None => continue, // Media not loaded yet.
                    }
                }
                None => continue,
            };

            items.push(FrameItemDescriptor::Layer(LayerDescriptor {
                texture_id,
                transform: element.transform.clone(),
                opacity: element.opacity,
                blend_mode: element.blend_mode,
                effect_pass_groups: element.effect_pass_groups.clone(),
                mask: element.mask.clone(),
            }));
        }
    }

    FrameDescriptor {
        width: project.width,
        height: project.height,
        clear: CanvasClearDescriptor {
            color: project.background_color,
        },
        items,
    }
}

/// Whether an element type produces visible pixels on the canvas.
fn is_visual(element_type: ElementType) -> bool {
    matches!(
        element_type,
        ElementType::Video | ElementType::Image | ElementType::Graphic
    )
}
