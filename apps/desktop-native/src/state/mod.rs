//! Editor state module — re-exports the project model + persistence.
//!
//! Mirrors `apps/desktop-web/src/state/mod.rs`. The project model lives
//! in `project.rs`; native save/load lives in `persistence.rs`.

pub mod persistence;
pub mod project;

// Re-export all public types so `crate::state::Project` etc. work
// without callers needing to know the internal file layout.
pub use project::{
    CanvasSize, Element, MediaAsset, MediaKind, Playhead, Project, ProjectMetadata,
    ProjectSettings, Scene, Track, TrackType,
};
