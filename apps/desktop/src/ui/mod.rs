//! UI module — all GPUI panels and layout components for the editor.
//!
//! The layout mirrors the web app:
//! - Header (project name, export, settings)
//! - Middle row: Toolbar + Assets Panel + Viewport (WGPU) + Inspector
//! - Timeline (tracks, ruler, playhead)
//! - Footer (playback controls, time, status)

pub mod editor_layout;
pub mod header;
pub mod footer;
pub mod toolbar;
pub mod viewport_panel;
pub mod timeline;
pub mod inspector;
pub mod assets;
pub mod ai;
