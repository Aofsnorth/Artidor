//! Editor state — the single source of truth for project data, selection,
//! and playback position. All UI panels read from and write to this state.

pub mod editor_state;
pub mod persistence;
pub mod project;

pub use project::ElementType;
